package com.example.ui.admin

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.CloudSyncManager
import com.example.data.toMaterialLot
import com.example.model.MaterialLot
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Database-driven snapshot for the CPCB / MoEFCC oversight portal. */
data class AdminMetrics(
    val collectors: Long = 0,
    val recyclers: Long = 0,
    val admins: Long = 0,
    val lots: Long = 0,
    val pendingLots: Long = 0,
    val confirmedLots: Long = 0,
    val totalWeightKg: Double = 0.0,
    val settledValueInr: Double = 0.0,
    val formalizationPercent: Double = 0.0
)

/**
 * Government-admin portal data source.
 *
 * Reads the shared Supabase source of truth through the admin role views
 * (`v_admin_metrics`, `v_admin_lots`). Every number shown is computed by the
 * database from live rows — there is no hardcoded statistic and no per-role
 * copy of the dataset.
 */
class AdminViewModel(application: Application) : AndroidViewModel(application) {

    private val _metrics = MutableStateFlow(AdminMetrics())
    val metrics: StateFlow<AdminMetrics> = _metrics.asStateFlow()

    private val _lots = MutableStateFlow<List<MaterialLot>>(emptyList())
    val lots: StateFlow<List<MaterialLot>> = _lots.asStateFlow()

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _lastError = MutableStateFlow<String?>(null)
    val lastError: StateFlow<String?> = _lastError.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _isSyncing.value = true
            try {
                val dto = CloudSyncManager.fetchAdminMetrics()
                val remoteLots = CloudSyncManager.fetchAdminLots()
                _lots.value = remoteLots.map { it.toMaterialLot() }
                if (dto != null) {
                    val formalization = if (dto.lot_count > 0L) {
                        (dto.confirmed_lot_count.toDouble() / dto.lot_count.toDouble()) * 100.0
                    } else {
                        0.0
                    }
                    _metrics.value = AdminMetrics(
                        collectors = dto.collector_count,
                        recyclers = dto.recycler_count,
                        admins = dto.admin_count,
                        lots = dto.lot_count,
                        pendingLots = dto.pending_lot_count,
                        confirmedLots = dto.confirmed_lot_count,
                        totalWeightKg = dto.total_weight_kg,
                        settledValueInr = dto.settled_value_inr,
                        formalizationPercent = formalization
                    )
                }
                _lastError.value = null
            } catch (e: Exception) {
                _lastError.value = e.message
            } finally {
                _isSyncing.value = false
            }
        }
    }
}
