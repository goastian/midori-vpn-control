<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import AsyncState from '../../components/AsyncState.vue'
import PaginationControls from '../../components/PaginationControls.vue'
import ResourceSkeleton from '../../components/ResourceSkeleton.vue'
import { api } from '../../lib/api'
import { useLocale } from '../../lib/i18n'
import {
  beginResourceLoad,
  completeResourceLoad,
  type ResourceState,
} from '../../lib/resource-state'
import {
  AdminClusterPageSchema,
  AdminCoreNodePageSchema,
  NodeEnrollmentTokenSchema,
  type AdminCluster,
  type AdminCoreNode,
  type NodeEnrollmentToken,
} from '../../lib/schemas'

const { t, formatDateTime } = useLocale()
const clusters = ref<AdminCluster[]>([])
const clustersState = ref<ResourceState>('idle')
const clusterPage = ref(1)
const clusterTotal = ref(0)
const selectedClusterID = ref('')
const nodes = ref<AdminCoreNode[]>([])
const nodesState = ref<ResourceState>('idle')
const nodePage = ref(1)
const nodeTotal = ref(0)
const CLUSTER_PAGE_SIZE = 20
const NODE_PAGE_SIZE = 50
const showClusterForm = ref(false)
const showNodeForm = ref(false)
const creatingCluster = ref(false)
const creatingNode = ref(false)
const mutatingNodeID = ref('')
const feedback = ref<{ kind: 'success' | 'error'; message: string } | null>(null)
const enrollment = ref<NodeEnrollmentToken | null>(null)
const tokenCopied = ref(false)

const clusterDraft = reactive({ name: '', region: '', is_principal: false })
const nodeDraft = reactive({ name: '', management_host: '' })

const selectedCluster = computed(
  () => clusters.value.find((cluster) => cluster.id === selectedClusterID.value) ?? null,
)

async function loadClusters(requestedPage = clusterPage.value) {
  clustersState.value = beginResourceLoad(
    clusters.value.length > 0 || clustersState.value === 'empty',
  )
  try {
    const response = await api.validated(
      `/api/v1/admin/clusters?page=${requestedPage}&page_size=${CLUSTER_PAGE_SIZE}&status=all&sort=name&order=asc`,
      AdminClusterPageSchema,
    )
    clusters.value = response.items
    clusterPage.value = response.page
    clusterTotal.value = response.total
    clustersState.value = completeResourceLoad(clusters.value.length > 0)
    const selectionStillVisible = clusters.value.some(
      (cluster) => cluster.id === selectedClusterID.value,
    )
    if (!selectionStillVisible) selectedClusterID.value = clusters.value[0]?.id ?? ''
    if (selectedClusterID.value) await loadNodes(1)
    else {
      nodes.value = []
      nodesState.value = 'empty'
    }
  } catch {
    clustersState.value = 'error'
  }
}

async function loadNodes(requestedPage = nodePage.value) {
  if (!selectedClusterID.value) return
  nodesState.value = beginResourceLoad(nodes.value.length > 0 || nodesState.value === 'empty')
  try {
    const response = await api.validated(
      `/api/v1/admin/clusters/${selectedClusterID.value}/nodes?page=${requestedPage}&page_size=${NODE_PAGE_SIZE}&status=all&sort=name&order=asc`,
      AdminCoreNodePageSchema,
    )
    nodes.value = response.items
    nodePage.value = response.page
    nodeTotal.value = response.total
    nodesState.value = completeResourceLoad(nodes.value.length > 0)
  } catch {
    nodesState.value = 'error'
  }
}

async function selectCluster(cluster: AdminCluster) {
  if (selectedClusterID.value === cluster.id && nodesState.value !== 'error') return
  selectedClusterID.value = cluster.id
  nodes.value = []
  nodePage.value = 1
  await loadNodes(1)
}

async function refreshAll() {
  await loadClusters(clusterPage.value)
}

async function createCluster() {
  if (!clusterDraft.name.trim() || !clusterDraft.region.trim()) return
  creatingCluster.value = true
  feedback.value = null
  try {
    await api.post('/api/v1/admin/clusters', {
      name: clusterDraft.name.trim(),
      region: clusterDraft.region.trim(),
      policy_labels: {},
      is_principal: clusterDraft.is_principal,
    })
    Object.assign(clusterDraft, { name: '', region: '', is_principal: false })
    showClusterForm.value = false
    feedback.value = { kind: 'success', message: t('adminClusters.clusterCreated') }
    await loadClusters(1)
  } catch {
    feedback.value = { kind: 'error', message: t('adminClusters.clusterCreateError') }
  } finally {
    creatingCluster.value = false
  }
}

function nodeCreationDisabledReason(cluster: AdminCluster | null): string {
  if (!cluster) return t('adminClusters.nodeDisabledNoCluster')
  if (cluster.state === 'revoked' || cluster.state === 'retired') {
    return t('adminClusters.nodeDisabledClusterState')
  }
  return ''
}

async function createNode() {
  if (!selectedCluster.value || nodeCreationDisabledReason(selectedCluster.value)) return
  if (!nodeDraft.name.trim() || !nodeDraft.management_host.trim()) return
  creatingNode.value = true
  feedback.value = null
  try {
    await api.post(`/api/v1/admin/clusters/${selectedCluster.value.id}/nodes`, {
      name: nodeDraft.name.trim(),
      management_host: nodeDraft.management_host.trim(),
    })
    Object.assign(nodeDraft, { name: '', management_host: '' })
    showNodeForm.value = false
    feedback.value = { kind: 'success', message: t('adminClusters.nodeCreated') }
    await loadNodes(1)
    await loadClusters(clusterPage.value)
  } catch {
    feedback.value = { kind: 'error', message: t('adminClusters.nodeCreateError') }
  } finally {
    creatingNode.value = false
  }
}

function tokenDisabledReason(node: AdminCoreNode): string {
  if (node.enrolled) return t('adminClusters.tokenDisabledEnrolled')
  if (node.state !== 'enrolling') return t('adminClusters.tokenDisabledState')
  return ''
}

function revokeDisabledReason(node: AdminCoreNode): string {
  return node.state === 'revoked' || node.state === 'retired'
    ? t('adminClusters.revokeDisabledState')
    : ''
}

async function issueEnrollmentToken(node: AdminCoreNode) {
  if (tokenDisabledReason(node) || !window.confirm(t('adminClusters.tokenConfirm'))) return
  mutatingNodeID.value = node.id
  feedback.value = null
  try {
    enrollment.value = await api.validated(
      `/api/v1/admin/nodes/${node.id}/enrollment-token`,
      NodeEnrollmentTokenSchema,
      { method: 'POST', body: JSON.stringify({ ttl_minutes: 15 }) },
    )
    tokenCopied.value = false
  } catch {
    feedback.value = { kind: 'error', message: t('adminClusters.tokenError') }
  } finally {
    mutatingNodeID.value = ''
  }
}

async function copyEnrollmentToken() {
  if (!enrollment.value) return
  try {
    await navigator.clipboard.writeText(enrollment.value.token)
    tokenCopied.value = true
  } catch {
    tokenCopied.value = false
  }
}

function closeEnrollment() {
  enrollment.value = null
  tokenCopied.value = false
}

async function revokeNode(node: AdminCoreNode) {
  if (revokeDisabledReason(node) || !window.confirm(t('adminClusters.revokeConfirm'))) return
  mutatingNodeID.value = node.id
  feedback.value = null
  try {
    await api.post(`/api/v1/admin/nodes/${node.id}/revoke`)
    feedback.value = { kind: 'success', message: t('adminClusters.revokeSuccess') }
    await loadNodes(nodePage.value)
    await loadClusters(clusterPage.value)
  } catch {
    feedback.value = { kind: 'error', message: t('adminClusters.revokeError') }
  } finally {
    mutatingNodeID.value = ''
  }
}

function stateTone(state: string): string {
  if (state === 'active') return 'border-midori-700/50 bg-midori-950/60 text-midori-300'
  if (state === 'draining' || state === 'enrolling')
    return 'border-amber-700/50 bg-amber-950/60 text-amber-300'
  if (state === 'revoked' || state === 'retired')
    return 'border-rose-700/50 bg-rose-950/60 text-rose-300'
  return 'border-slate-700 bg-slate-950/60 text-slate-300'
}

function stateLabel(state: AdminCluster['state']): string {
  return t(`adminClusters.states.${state}`)
}

function revision(value: number | null): string {
  return value === null ? t('common.unavailable') : `r${value}`
}

function transportEntries(node: AdminCoreNode) {
  return Object.entries(node.transport_states).sort(([left], [right]) => left.localeCompare(right))
}

onMounted(() => loadClusters())
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white">{{ t('adminClusters.title') }}</h1>
        <p class="mt-1 max-w-3xl text-sm text-slate-400">{{ t('adminClusters.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          data-test="refresh-clusters"
          :disabled="clustersState === 'loading' || clustersState === 'refreshing'"
          @click="refreshAll"
        >
          {{ t('adminClusters.refresh') }}
        </button>
        <button
          type="button"
          class="btn-primary"
          data-test="add-cluster"
          @click="showClusterForm = !showClusterForm"
        >
          {{ t('adminClusters.addCluster') }}
        </button>
      </div>
    </header>

    <p
      v-if="feedback"
      :role="feedback.kind === 'error' ? 'alert' : 'status'"
      class="rounded-2xl border px-4 py-3 text-sm"
      :class="
        feedback.kind === 'error'
          ? 'border-rose-800/50 bg-rose-950/30 text-rose-300'
          : 'border-midori-800/50 bg-midori-950/30 text-midori-300'
      "
    >
      {{ feedback.message }}
    </p>

    <form
      v-if="showClusterForm"
      class="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 md:grid-cols-2"
      data-test="cluster-form"
      @submit.prevent="createCluster"
    >
      <label class="text-sm text-slate-300">
        <span class="mb-1 block font-semibold">{{ t('adminClusters.clusterName') }}</span>
        <input v-model="clusterDraft.name" required maxlength="64" class="input-field" />
      </label>
      <label class="text-sm text-slate-300">
        <span class="mb-1 block font-semibold">{{ t('adminClusters.region') }}</span>
        <input v-model="clusterDraft.region" required maxlength="64" class="input-field" />
      </label>
      <label class="flex items-center gap-2 text-sm text-slate-300">
        <input v-model="clusterDraft.is_principal" type="checkbox" />
        {{ t('adminClusters.principal') }}
      </label>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="showClusterForm = false">
          {{ t('common.cancel') }}
        </button>
        <button type="submit" class="btn-primary" :disabled="creatingCluster">
          {{ creatingCluster ? t('adminClusters.creating') : t('common.create') }}
        </button>
      </div>
    </form>

    <ResourceSkeleton
      v-if="clustersState === 'idle' || clustersState === 'loading'"
      :title="t('adminClusters.loading')"
      :count="3"
      item-class="h-32"
    />
    <AsyncState
      v-else-if="clustersState === 'error' && clusters.length === 0"
      kind="error"
      :title="t('adminClusters.loadError')"
      :retry-label="t('common.retry')"
      @retry="loadClusters()"
    />
    <AsyncState
      v-else-if="clustersState === 'empty'"
      kind="empty"
      :title="t('adminClusters.empty')"
    />
    <section v-else aria-live="polite">
      <p
        v-if="clustersState === 'error' && clusters.length > 0"
        role="alert"
        class="mb-3 rounded-xl border border-rose-800/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-300"
      >
        {{ t('common.refreshFailed') }}
      </p>
      <p v-if="clustersState === 'refreshing'" class="mb-3 text-xs text-slate-400">
        {{ t('common.refreshing') }}
      </p>
      <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="cluster in clusters"
          :key="cluster.id"
          type="button"
          class="rounded-3xl border p-5 text-left transition"
          :class="
            selectedClusterID === cluster.id
              ? 'border-midori-600 bg-midori-950/30'
              : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
          "
          @click="selectCluster(cluster)"
        >
          <span class="flex items-start justify-between gap-3">
            <span>
              <span class="block text-lg font-bold text-white">{{ cluster.name }}</span>
              <span class="mt-1 block text-xs text-slate-400">{{ cluster.region }}</span>
            </span>
            <span
              :class="stateTone(cluster.state)"
              class="rounded-full border px-2.5 py-1 text-xs font-semibold"
            >
              {{ stateLabel(cluster.state) }}
            </span>
          </span>
          <span
            v-if="cluster.is_principal"
            class="mt-3 inline-flex rounded-lg bg-cyan-950/60 px-2 py-1 text-xs font-semibold text-cyan-300"
          >
            {{ t('adminClusters.principal') }}
          </span>
          <span class="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
            <span
              ><strong class="block text-lg text-white">{{ cluster.node_count }}</strong
              >{{ t('adminClusters.nodes') }}</span
            >
            <span
              ><strong class="block text-lg text-white">{{ cluster.active_node_count }}</strong
              >{{ t('adminClusters.activeNodes') }}</span
            >
            <span
              ><strong class="block text-lg text-white">{{ cluster.healthy_node_count }}</strong
              >{{ t('adminClusters.healthyNodes') }}</span
            >
          </span>
        </button>
      </div>
      <PaginationControls
        :page="clusterPage"
        :page-size="CLUSTER_PAGE_SIZE"
        :total="clusterTotal"
        :disabled="clustersState === 'refreshing'"
        @change="loadClusters"
      />
    </section>

    <section v-if="selectedCluster" class="space-y-4 border-t border-slate-800 pt-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white">
            {{ t('adminClusters.clusterNodes', { name: selectedCluster.name }) }}
          </h2>
          <p class="mt-1 text-sm text-slate-400">{{ t('adminClusters.nodesSubtitle') }}</p>
        </div>
        <button
          type="button"
          class="btn-primary self-start disabled:cursor-not-allowed disabled:opacity-50"
          data-test="add-node"
          :disabled="Boolean(nodeCreationDisabledReason(selectedCluster))"
          :title="nodeCreationDisabledReason(selectedCluster)"
          @click="showNodeForm = !showNodeForm"
        >
          {{ t('adminClusters.addNode') }}
        </button>
      </div>
      <p
        v-if="nodeCreationDisabledReason(selectedCluster)"
        class="text-xs text-amber-300"
        role="status"
      >
        {{ nodeCreationDisabledReason(selectedCluster) }}
      </p>

      <form
        v-if="showNodeForm"
        class="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 md:grid-cols-2"
        data-test="node-form"
        @submit.prevent="createNode"
      >
        <label class="text-sm text-slate-300">
          <span class="mb-1 block font-semibold">{{ t('adminClusters.nodeName') }}</span>
          <input
            v-model="nodeDraft.name"
            required
            maxlength="63"
            pattern="[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
            class="input-field"
          />
        </label>
        <label class="text-sm text-slate-300">
          <span class="mb-1 block font-semibold">{{ t('adminClusters.managementHost') }}</span>
          <input v-model="nodeDraft.management_host" required maxlength="253" class="input-field" />
        </label>
        <div class="flex justify-end gap-2 md:col-span-2">
          <button type="button" class="btn-secondary" @click="showNodeForm = false">
            {{ t('common.cancel') }}
          </button>
          <button type="submit" class="btn-primary" :disabled="creatingNode">
            {{ creatingNode ? t('adminClusters.creating') : t('common.create') }}
          </button>
        </div>
      </form>

      <ResourceSkeleton
        v-if="nodesState === 'idle' || nodesState === 'loading'"
        :title="t('adminClusters.nodesLoading')"
        :count="2"
        item-class="h-64"
      />
      <AsyncState
        v-else-if="nodesState === 'error' && nodes.length === 0"
        kind="error"
        :title="t('adminClusters.nodesLoadError')"
        :retry-label="t('common.retry')"
        @retry="loadNodes()"
      />
      <AsyncState
        v-else-if="nodesState === 'empty'"
        kind="empty"
        :title="t('adminClusters.nodesEmpty')"
      />
      <div v-else class="space-y-4">
        <p
          v-if="nodesState === 'error' && nodes.length > 0"
          role="alert"
          class="rounded-xl border border-rose-800/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-300"
        >
          {{ t('common.refreshFailed') }}
        </p>
        <p v-if="nodesState === 'refreshing'" class="text-xs text-slate-400">
          {{ t('common.refreshing') }}
        </p>
        <article
          v-for="node in nodes"
          :key="node.id"
          class="rounded-3xl border border-slate-800 bg-slate-900/80 p-5"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-bold text-white">{{ node.name }}</h3>
                <span
                  :class="stateTone(node.state)"
                  class="rounded-full border px-2.5 py-1 text-xs font-semibold"
                  >{{ stateLabel(node.state) }}</span
                >
                <span
                  :class="node.placement_ready ? 'text-midori-300' : 'text-amber-300'"
                  class="text-xs font-semibold"
                >
                  {{
                    t(
                      node.placement_ready
                        ? 'adminClusters.placementReady'
                        : 'adminClusters.placementBlocked',
                    )
                  }}
                </span>
              </div>
              <p class="mt-1 break-all font-mono text-xs text-slate-400">
                {{ node.management_host }}
              </p>
            </div>
            <div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-cyan-700/50 px-3 py-1.5 text-xs font-semibold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="Boolean(tokenDisabledReason(node)) || mutatingNodeID === node.id"
                  :title="tokenDisabledReason(node)"
                  @click="issueEnrollmentToken(node)"
                >
                  {{ t('adminClusters.issueToken') }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-rose-700/50 px-3 py-1.5 text-xs font-semibold text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="Boolean(revokeDisabledReason(node)) || mutatingNodeID === node.id"
                  :title="revokeDisabledReason(node)"
                  @click="revokeNode(node)"
                >
                  {{ t('adminClusters.revokeNode') }}
                </button>
              </div>
              <p v-if="tokenDisabledReason(node)" class="mt-2 max-w-sm text-xs text-slate-400">
                {{ tokenDisabledReason(node) }}
              </p>
              <p v-if="revokeDisabledReason(node)" class="mt-2 max-w-sm text-xs text-slate-400">
                {{ revokeDisabledReason(node) }}
              </p>
            </div>
          </div>

          <p
            class="mt-4 rounded-xl border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200"
          >
            {{ t(`adminClusters.placementReasons.${node.placement_reason}`) }}
          </p>

          <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <dt class="text-xs text-slate-500">{{ t('adminClusters.enrollment') }}</dt>
              <dd class="mt-1 text-slate-200">
                {{ t(node.enrolled ? 'adminClusters.enrolled' : 'adminClusters.notEnrolled') }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ t('adminClusters.coreVersion') }}</dt>
              <dd class="mt-1 font-mono text-slate-200">
                {{ node.core_version || t('common.unavailable') }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ t('adminClusters.heartbeat') }}</dt>
              <dd class="mt-1 text-slate-200">
                {{
                  node.last_seen_at ? formatDateTime(node.last_seen_at) : t('adminClusters.never')
                }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ t('adminClusters.server') }}</dt>
              <dd class="mt-1 text-slate-200">
                {{ node.server_name || t('adminClusters.unbound') }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ t('adminClusters.desiredRevision') }}</dt>
              <dd class="mt-1 font-mono text-slate-200">{{ revision(node.desired_revision) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ t('adminClusters.observedRevision') }}</dt>
              <dd class="mt-1 font-mono text-slate-200">{{ revision(node.applied_revision) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ t('adminClusters.compatibility') }}</dt>
              <dd class="mt-1 text-slate-200">
                {{
                  t(
                    node.version_compatible === true
                      ? 'adminClusters.compatible'
                      : node.version_compatible === false
                        ? 'adminClusters.incompatible'
                        : 'adminClusters.unknown',
                  )
                }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ t('adminClusters.capacity') }}</dt>
              <dd class="mt-1 font-mono text-slate-200">
                {{
                  node.current_peers === null || node.max_peers === null
                    ? t('common.unavailable')
                    : `${node.current_peers} / ${node.max_peers}`
                }}
              </dd>
            </div>
          </dl>

          <div class="mt-4">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {{ t('adminClusters.transports') }}
            </p>
            <div v-if="transportEntries(node).length" class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="[protocol, transport] in transportEntries(node)"
                :key="protocol"
                class="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300"
              >
                {{ protocol }} · {{ transport.status }} ·
                {{
                  t(transport.certified ? 'adminClusters.certified' : 'adminClusters.uncertified')
                }}
              </span>
            </div>
            <p v-else class="mt-2 text-xs text-slate-500">{{ t('adminClusters.noTransports') }}</p>
          </div>
        </article>
        <PaginationControls
          :page="nodePage"
          :page-size="NODE_PAGE_SIZE"
          :total="nodeTotal"
          :disabled="nodesState === 'refreshing'"
          @change="loadNodes"
        />
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="enrollment"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="enrollment-token-title"
      >
        <div
          class="w-full max-w-xl rounded-3xl border border-cyan-800/60 bg-slate-900 p-6 shadow-2xl"
        >
          <h2 id="enrollment-token-title" class="text-xl font-bold text-white">
            {{ t('adminClusters.tokenTitle') }}
          </h2>
          <p class="mt-2 text-sm text-amber-200">{{ t('adminClusters.tokenDetail') }}</p>
          <code class="mt-4 block break-all rounded-xl bg-slate-950 p-4 text-sm text-cyan-300">{{
            enrollment.token
          }}</code>
          <p class="mt-3 text-xs text-slate-400">
            {{ t('adminClusters.tokenExpires', { date: formatDateTime(enrollment.expires_at) }) }}
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="btn-secondary" @click="copyEnrollmentToken">
              {{ tokenCopied ? t('adminClusters.copied') : t('common.copy') }}
            </button>
            <button type="button" class="btn-primary" @click="closeEnrollment">
              {{ t('common.close') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
