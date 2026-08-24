package com.zisamale.data.local

import androidx.room.*
import com.zisamale.domain.model.*

@Dao
interface HouseholdDao {
    @Query("SELECT * FROM households WHERE chw_id = :chwId")
    suspend fun getByChwId(chwId: String): List<HouseholdEntity>

    @Query("SELECT * FROM households WHERE household_id = :id")
    suspend fun getById(id: String): HouseholdEntity?

    @Query("SELECT * FROM households WHERE sync_status = 'pending' ORDER BY last_updated ASC")
    suspend fun getUnsynced(): List<HouseholdEntity>

    @Query("UPDATE households SET sync_status = :status WHERE household_id = :id")
    suspend fun updateSyncStatus(id: String, status: String)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(households: List<HouseholdEntity>)

    @Query("DELETE FROM households WHERE household_id = :id")
    suspend fun delete(id: String)
}

@Dao
interface PregnancyDao {
    @Query("SELECT * FROM pregnancies WHERE household_id = :householdId AND is_active = 1")
    suspend fun getActiveByHousehold(householdId: String): PregnancyEntity?

    @Query("SELECT * FROM pregnancies WHERE chw_id = :chwId AND is_active = 1 ORDER BY risk_score DESC")
    suspend fun getPrioritizedByChw(chwId: String): List<PregnancyEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(pregnancy: PregnancyEntity)
}

@Dao
interface ChildDao {
    @Query("SELECT * FROM children WHERE household_id = :householdId")
    suspend fun getByHousehold(householdId: String): List<ChildEntity>

    @Query("SELECT * FROM children WHERE child_id = :childId")
    suspend fun getById(childId: String): ChildEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(child: ChildEntity)
}

@Dao
interface VisitDao {
    @Query("SELECT * FROM visits WHERE chw_id = :chwId ORDER BY visit_date DESC")
    suspend fun getByChwId(chwId: String): List<VisitEntity>

    @Query("SELECT * FROM visits WHERE visit_id = :visitId")
    suspend fun getById(visitId: String): VisitEntity?

    @Query("SELECT * FROM visits WHERE sync_status IN ('pending', 'failed')")
    suspend fun getUnsynced(): List<VisitEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(visit: VisitEntity)

    @Query("UPDATE visits SET sync_status = :status WHERE visit_id = :visitId")
    suspend fun updateSyncStatus(visitId: String, status: String)
}

@Dao
interface ReferralDao {
    @Query("SELECT * FROM referrals WHERE chw_id = :chwId ORDER BY created_at DESC")
    suspend fun getByChwId(chwId: String): List<ReferralEntity>

    @Query("SELECT * FROM referrals WHERE status IN ('pending', 'failed')")
    suspend fun getUnsynced(): List<ReferralEntity>

    @Query("SELECT * FROM referrals WHERE referral_id = :referralId")
    suspend fun getById(referralId: String): ReferralEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(referral: ReferralEntity)

    @Query("UPDATE referrals SET status = :status WHERE referral_id = :referralId")
    suspend fun updateStatus(referralId: String, status: String)
}

@Dao
interface PhotoDao {
    @Query("SELECT * FROM photo_queue WHERE sync_status IN ('pending', 'failed')")
    suspend fun getUnsynced(): List<PhotoEntity>

    @Query("SELECT COUNT(*) FROM photo_queue WHERE visit_id = :visitId")
    suspend fun countByVisit(visitId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(photo: PhotoEntity)

    @Query("UPDATE photo_queue SET sync_status = :status, remote_file_id = :remoteFileId WHERE photo_id = :photoId")
    suspend fun updateSyncResult(photoId: String, status: String, remoteFileId: String?)
}
