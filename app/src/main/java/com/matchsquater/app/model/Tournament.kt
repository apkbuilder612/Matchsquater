package com.matchsquater.app.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Tournament(
    val id: String,
    val title: String,
    val game: String,
    @SerialName("target_players") val targetPlayers: Int,
    val status: String,
    val announcement: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)
