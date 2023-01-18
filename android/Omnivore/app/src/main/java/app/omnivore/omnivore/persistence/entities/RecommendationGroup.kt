package app.omnivore.omnivore.persistence.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity
data class RecommendationGroup(
  @PrimaryKey val id: String,
  val name: String?,
  val canPost: Boolean,
  val canSeeMembers: Boolean,
  val inviteURL: String?,
  val createdAt: String?,
  val updatedAt: String?
)

// hasMany admins (Viewer)
// hasMany members (Viewer)