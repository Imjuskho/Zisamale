package com.zisamale.di

import android.content.Context
import com.zisamale.data.local.ZisamaleDatabase
import com.zisamale.data.remote.ApiClient
import com.zisamale.data.remote.ZisamaleApi
import com.zisamale.data.session.SessionStore
import com.zisamale.data.sync.SyncManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): ZisamaleDatabase {
        return ZisamaleDatabase.create(context)
    }

    @Provides
    @Singleton
    fun provideSessionStore(@ApplicationContext context: Context): SessionStore {
        return SessionStore(context)
    }

    @Provides
    @Singleton
    fun provideApiClient(sessionStore: SessionStore): ApiClient {
        return ApiClient(sessionStore)
    }

    @Provides
    @Singleton
    fun provideApi(apiClient: ApiClient): ZisamaleApi {
        return apiClient.instance
    }

    @Provides
    @Singleton
    fun provideSyncManager(
        db: ZisamaleDatabase,
        api: ZisamaleApi,
        sessionStore: SessionStore
    ): SyncManager {
        return SyncManager(db, api, sessionStore)
    }
}
