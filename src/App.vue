<template>
	<div class="app">
		<el-container direction="vertical" class="app-container">
			<el-header class="app-header" height="72px">
				<h1>Out of Stock Dashboard</h1>
			</el-header>
			
			<el-main>
				<el-skeleton
					v-if="loading"
					animated
					:rows="5"
					class="skeleton"
				/>
				
				<el-alert
					v-else-if="error"
					type="error"
					show-icon
					:title="'Помилка завантаження'"
					class="alert"
				>
					{{ error }}
				</el-alert>
				
				<template v-else>
					<el-card class="filters-card" shadow="hover">
						<template #header>
							<div class="card-header">
								<span>Фільтри</span>
								<el-button
									size="small"
									type="primary"
									text
									@click="resetFilters"
								>
									Скинути
								</el-button>
							</div>
						</template>
						
						<el-row :gutter="16">
							<el-col :xs="24" :sm="24" :md="10" :lg="10">
								<div class="filter-label">Мережа</div>
								<el-select
									v-model="selectedNetworkIds"
									multiple
									filterable
									collapse-tags
									clearable
									placeholder="Усі мережі"
									class="full-width"
								>
									<el-option
										v-for="net in holdings"
										:key="net.id"
										:label="net.name"
										:value="String(net.id)"
									/>
								</el-select>
							</el-col>
							
							<el-col :xs="24" :sm="12" :md="7" :lg="7">
								<div class="filter-label">Місто</div>
								<el-select
									v-model="selectedCityId"
									clearable
									filterable
									placeholder="Усі міста"
									class="full-width"
								>
									<el-option
										v-for="city in cities"
										:key="city.id"
										:label="city.name"
										:value="String(city.id)"
									/>
								</el-select>
							</el-col>
							
							<el-col :xs="24" :sm="12" :md="7" :lg="7">
								<div class="filter-label">Клієнт</div>
								<el-select
									v-model="selectedClientId"
									clearable
									filterable
									placeholder="Усі клієнти"
									class="full-width"
								>
									<el-option
										v-for="client in clients"
										:key="client.id"
										:label="client.name"
										:value="String(client.id)"
									/>
								</el-select>
							</el-col>
						</el-row>
					</el-card>
					
					<el-row :gutter="16" class="charts-row">
						<el-col :xs="24">
							<el-card shadow="hover" class="chart-card">
								<template #header>
									<div class="card-header">
										<span>Загальний Out of Stock</span>
										<el-tag size="small" effect="dark" type="info">
											Рядків: {{ filteredMatrix.length }}
										</el-tag>
									</div>
								</template>
								
								<div class="chart-wrapper">
									<canvas ref="overallChartCanvas"></canvas>
								</div>
								
								<div class="chart-summary">
									<span>OOS: <strong>{{ overallStats.oos }}%</strong></span>
									<span class="divider">·</span>
									<span>In stock: <strong>{{ overallStats.inStock }}%</strong></span>
								</div>
							</el-card>
						</el-col>
					</el-row>
					
					<el-row :gutter="16" class="charts-row">
						<el-col :xs="24" :lg="12">
							<el-card shadow="hover" class="chart-card">
								<template #header>
									<div class="card-header">
										<span>Мережі (Out of Stock, %)</span>
									</div>
								</template>
								
								<div class="chart-wrapper">
									<canvas ref="networksChartCanvas"></canvas>
								</div>
								
								<p class="hint">
									Клік по бару мережі — зафіксувати фільтр по цій мережі
									(оновиться графік SKU).
								</p>
							</el-card>
						</el-col>
						
						<el-col :xs="24" :lg="12">
							<el-card shadow="hover" class="chart-card">
								<template #header>
									<div class="card-header">
										<span>SKU (Top 30, Out of Stock, %)</span>
									</div>
								</template>
								
								<div class="chart-wrapper">
									<canvas ref="skuChartCanvas"></canvas>
								</div>
							</el-card>
						</el-col>
					</el-row>
					
					<section class="debug">
						<el-row :gutter="16" class="debug-row">
							<el-col :xs="24" :lg="10">
								<el-card shadow="hover"  class="debug-card">
									<h3 class="debug-subtitle">Мережі</h3>
									<el-table
										:data="networkStats"
										size="small"
										height="360"
										border
										empty-text="Немає даних"
									>
										<el-table-column
											type="index"
											label="#"
											width="50"
										/>
										<el-table-column
											prop="name"
											label="Мережа"
											min-width="160"
										/>
										<el-table-column
											prop="oos"
											label="OOS, %"
											width="90"
										/>
										<el-table-column
											prop="total"
											label="Кол-во рядов"
											width="120"
										/>
									</el-table>
								</el-card>
							</el-col>
							
							<el-col :xs="24" :lg="14">
								<el-card shadow="hover" class="debug-card">
									<h3 class="debug-subtitle">SKU (Top 30)</h3>
									<el-table
										:data="skuStats"
										size="small"
										height="360"
										border
										empty-text="Немає даних"
									>
										<el-table-column
											type="index"
											label="#"
											width="50"
										/>
										<el-table-column
											prop="name"
											label="SKU"
											min-width="260"
											show-overflow-tooltip
										/>
										<el-table-column
											prop="oos"
											label="OOS, %"
											width="90"
										/>
										<el-table-column
											prop="total"
											label="Кол-во рядов"
											width="120"
										/>
									</el-table>
								</el-card>
							</el-col>
						</el-row>
					</section>
				</template>
			</el-main>
		</el-container>
	</div>
</template>

<script setup>
import {ref, computed, onMounted, watch, nextTick} from 'vue';
import Chart from 'chart.js/auto';

const loading = ref(true);
const error = ref('');

const cities = ref([]);
const holdings = ref([]);
const clients = ref([]);
const skus = ref([]);
const tradePoints = ref([]);
const matrix = ref([]);

const selectedCityId = ref('');
const selectedClientId = ref('');
const selectedNetworkIds = ref([]);

const overallChartCanvas = ref(null);
const networksChartCanvas = ref(null);
const skuChartCanvas = ref(null);

const overallChart = ref(null);
const networksChart = ref(null);
const skuChart = ref(null);

async function fetchJSON(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return await res.json();
}

onMounted(async () => {
	try {
		const base = 'https://fmcg.fta.kyiv.ua/requests?';
		const [
			matrixRes,
			tradePointsRes,
			holdingsRes,
			citiesRes,
			clientsRes,
			skusRes
		] = await Promise.all([
			fetchJSON(base + 'getMatrixResultTest'),
			fetchJSON(base + 'getTradePointsTest'),
			fetchJSON(base + 'getHoldingsTest'),
			fetchJSON(base + 'getCitiesTest'),
			fetchJSON(base + 'getClientsTest'),
			fetchJSON(base + 'getSkuTest')
		]);
		
		matrix.value = matrixRes;
		tradePoints.value = tradePointsRes;
		holdings.value = holdingsRes;
		cities.value = citiesRes;
		clients.value = clientsRes;
		skus.value = skusRes;
	} catch (e) {
		console.error(e);
		error.value = e.message || String(e);
	} finally {
		loading.value = false;
		await nextTick();
		updateAllCharts();
	}
});

function resetFilters() {
	selectedNetworkIds.value = [];
	selectedCityId.value = '';
	selectedClientId.value = '';
}

const tradePointById = computed(() => {
	const map = {};
	for (const tp of tradePoints.value) map[tp.id] = tp;
	return map;
});

const holdingById = computed(() => {
	const map = {};
	for (const h of holdings.value) map[h.id] = h;
	return map;
});

const skuById = computed(() => {
	const map = {};
	for (const s of skus.value) map[s.id] = s;
	return map;
});

const selectedNetworkIdSet = computed(
	() => new Set(selectedNetworkIds.value.map((x) => Number(x)))
);

const filteredMatrix = computed(() => {
	return matrix.value.filter((row) => {
		const tp = tradePointById.value[row.id_tp];
		if (!tp) return false;
		
		if (
			selectedNetworkIdSet.value.size > 0 &&
			!selectedNetworkIdSet.value.has(Number(tp.id_net))
		) {
			return false;
		}
		
		if (
			selectedCityId.value &&
			Number(tp.id_city) !== Number(selectedCityId.value)
		) {
			return false;
		}
		
		if (
			selectedClientId.value &&
			Number(row.id_client) !== Number(selectedClientId.value)
		) {
			return false;
		}
		
		return true;
	});
});

function calcOOS(rows) {
	const total = rows.length;
	if (!total) return 0;
	let zero = 0;
	for (const r of rows) {
		if (Number(r.fact) === 0) zero++;
	}
	return Number(((zero / total) * 100).toFixed(1));
}

const overallStats = computed(() => {
	const oos = calcOOS(filteredMatrix.value);
	const inStock = Number((100 - oos).toFixed(1));
	return {oos, inStock};
});

const networkStats = computed(() => {
	const grouped = new Map();
	
	for (const row of filteredMatrix.value) {
		const tp = tradePointById.value[row.id_tp];
		if (!tp) continue;
		const netId = Number(tp.id_net);
		if (!grouped.has(netId)) grouped.set(netId, []);
		grouped.get(netId).push(row);
	}
	
	const stats = [];
	for (const [id, rows] of grouped.entries()) {
		stats.push({
			id,
			name: holdingById.value[id]?.name || `Мережа #${id}`,
			oos: calcOOS(rows),
			total: rows.length
		});
	}
	
	stats.sort((a, b) => b.oos - a.oos);
	return stats;
});

const skuStats = computed(() => {
	const grouped = new Map();
	
	for (const row of filteredMatrix.value) {
		const skuId = Number(row.id_sku);
		if (!grouped.has(skuId)) grouped.set(skuId, []);
		grouped.get(skuId).push(row);
	}
	
	const stats = [];
	for (const [id, rows] of grouped.entries()) {
		stats.push({
			id,
			name: skuById.value[id]?.name || `SKU #${id}`,
			oos: calcOOS(rows),
			total: rows.length
		});
	}
	
	stats.sort((a, b) => b.oos - a.oos);
	return stats.slice(0, 30);
});

function createOrUpdateOverallChart() {
	if (!overallChartCanvas.value) return;
	
	const ctx = overallChartCanvas.value.getContext('2d');
	if (!ctx) return;
	
	const {oos, inStock} = overallStats.value;
	const data = [oos, inStock];
	
	if (overallChart.value) {
		overallChart.value.destroy();
	}
	
	overallChart.value = new Chart(ctx, {
		type: 'doughnut',
		data: {
			labels: ['Out of stock', 'В наявності'],
			datasets: [
				{
					data
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: false
		}
	});
}

function createOrUpdateNetworksChart() {
	if (!networksChartCanvas.value) return;
	
	const ctx = networksChartCanvas.value.getContext('2d');
	if (!ctx) return;
	
	const labels = networkStats.value.map((n) => n.name);
	const data = networkStats.value.map((n) => n.oos);
	
	const maxValue = data.length ? Math.max(...data) : 0;
	const axisMax = Math.min(100, Math.max(10, Math.ceil(maxValue / 10) * 10));
	
	if (networksChart.value) {
		networksChart.value.destroy();
	}
	
	networksChart.value = new Chart(ctx, {
		type: 'bar',
		data: {
			labels,
			datasets: [
				{
					label: 'Out of stock, %',
					data
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			scales: {
				y: {
					beginAtZero: true,
					max: axisMax
				}
			},
			onClick: (evt, elements) => {
				if (!elements.length) return;
				const index = elements[0].index;
				const stat = networkStats.value[index];
				if (!stat) return;
				selectedNetworkIds.value = [String(stat.id)];
			}
		}
	});
}

function createOrUpdateSkuChart() {
	if (!skuChartCanvas.value) return;
	
	const ctx = skuChartCanvas.value.getContext('2d');
	if (!ctx) return;
	
	const labels = skuStats.value.map((s) => s.name);
	const data = skuStats.value.map((s) => s.oos);
	
	const maxValue = data.length ? Math.max(...data) : 0;
	const axisMax = Math.min(100, Math.max(10, Math.ceil(maxValue / 10) * 10));
	
	if (skuChart.value) {
		skuChart.value.destroy();
	}
	
	skuChart.value = new Chart(ctx, {
		type: 'bar',
		data: {
			labels,
			datasets: [
				{
					label: 'Out of stock, %',
					data
				}
			]
		},
		options: {
			indexAxis: 'y',
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			scales: {
				x: {
					beginAtZero: true,
					max: axisMax
				}
			}
		}
	});
}

function updateAllCharts() {
	if (loading.value) return;
	createOrUpdateOverallChart();
	createOrUpdateNetworksChart();
	createOrUpdateSkuChart();
}

watch(
	() => ({
		overall: overallStats.value,
		net: networkStats.value,
		sku: skuStats.value
	}),
	async () => {
		if (loading.value) return;
		await nextTick();
		updateAllCharts();
	},
	{deep: true}
);
</script>

<style scoped>
.app {
	min-height: 100vh;
}

.app-container {
	margin: 0 auto;
	padding: 16px;
	box-sizing: border-box;
}

.app-header {
	display: flex;
	align-items: center;
	justify-content: center;
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	margin-bottom: 12px;
}

.app-header h1 {
	font-size: 24px;
	font-weight: 600;
	color: #0c2940;
	margin: 0;
	text-align: center;
}

.skeleton,
.alert {
	margin-top: 16px;
}

.filters-card {
	margin-bottom: 16px;
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-weight: 500;
}

.filter-label {
	margin-bottom: 4px;
	font-size: 13px;
	color: #9ca3af;
}

.full-width {
	width: 100%;
}

.charts-row {
	margin-bottom: 16px;
}

.chart-card {
	height: 420px;
	display: flex;
	flex-direction: column;
}

.chart-wrapper {
	flex: 1;
	position: relative;
}

.chart-summary {
	margin-top: 8px;
	font-size: 14px;
	display: flex;
	align-items: center;
	gap: 6px;
}

.chart-summary .divider {
	opacity: 0.6;
}

.hint {
	font-size: 12px;
	color: #9ca3af;
	margin-top: 8px;
}

canvas {
	width: 100% !important;
	height: 300px !important;
}

.debug {
	margin-top: 24px;
}

.debug-row {
	margin-top: 8px;
}

.debug-card {
	height: 420px;
	display: flex;
	flex-direction: column;
}

.debug-subtitle {
	font-size: 14px;
	font-weight: 500;
	margin-bottom: 4px;
}
:deep(.el-card__body) {
	overflow: hidden;
}
</style>
