// Drizzle ORM Schema Definition
// This file defines the database schema using Drizzle ORM for type-safe database operations

import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  decimal, 
  jsonb, 
  integer,
  date,
  time,
  inet,
  check,
  unique,
  primaryKey
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================================================
// USERS AND AUTHENTICATION TABLES
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  emailVerified: boolean('email_verified').default(false),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  university: varchar('university', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 20 }),
  bio: text('bio'),
  preferences: jsonb('preferences').default({}),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: varchar('token', { length: 255 }).unique().notNull(),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  tokenType: varchar('token_type', { length: 50 }),
  scope: text('scope'),
  idToken: text('id_token'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  providerAccountUnique: unique().on(table.provider, table.providerAccountId),
}))

export const verificationTokens = pgTable('verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ============================================================================
// VENUES AND LOCATIONS
// ============================================================================

export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  description: text('description'),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).notNull().default('US'),
  postalCode: varchar('postal_code', { length: 20 }),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  websiteUrl: text('website_url'),
  socialMedia: jsonb('social_media').default({}),
  hours: jsonb('hours').default({}),
  amenities: text('amenities').array(),
  capacity: integer('capacity'),
  venueType: varchar('venue_type', { length: 50 }).notNull(),
  priceRange: integer('price_range'),
  coverImageUrl: text('cover_image_url'),
  coverVideoUrl: text('cover_video_url'),
  galleryImages: text('gallery_images').array(),
  isVerified: boolean('is_verified').default(false),
  isActive: boolean('is_active').default(true),
  ownerId: uuid('owner_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  latitudeCheck: check('check_latitude', `${table.latitude} >= -90 AND ${table.latitude} <= 90`),
  longitudeCheck: check('check_longitude', `${table.longitude} >= -180 AND ${table.longitude} <= 180`),
  capacityCheck: check('check_venue_capacity', `${table.capacity} IS NULL OR ${table.capacity} > 0`),
  priceRangeCheck: check('check_price_range', `${table.priceRange} IS NULL OR (${table.priceRange} >= 1 AND ${table.priceRange} <= 4)`),
}))

export const venueCategories = pgTable('venue_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 7 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const venueCategoryMappings = pgTable('venue_category_mappings', {
  venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => venueCategories.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.venueId, table.categoryId] }),
}))

// ============================================================================
// PROMOTIONS AND EVENTS
// ============================================================================

export const promotions = pgTable('promotions', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  promotionType: varchar('promotion_type', { length: 50 }).notNull(),
  discountPercentage: integer('discount_percentage'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }),
  minimumSpend: decimal('minimum_spend', { precision: 10, scale: 2 }),
  termsConditions: text('terms_conditions'),
  imageUrl: text('image_url'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  daysOfWeek: integer('days_of_week').array().default([1,2,3,4,5,6,7]),
  startTime: time('start_time'),
  endTime: time('end_time'),
  maxRedemptions: integer('max_redemptions'),
  currentRedemptions: integer('current_redemptions').default(0),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  discountPercentageCheck: check('check_discount_percentage', `${table.discountPercentage} IS NULL OR (${table.discountPercentage} >= 0 AND ${table.discountPercentage} <= 100)`),
  minimumSpendCheck: check('check_minimum_spend', `${table.minimumSpend} IS NULL OR ${table.minimumSpend} >= 0`),
  maxRedemptionsCheck: check('check_max_redemptions', `${table.maxRedemptions} IS NULL OR ${table.maxRedemptions} > 0`),
  currentRedemptionsCheck: check('check_current_redemptions', `${table.currentRedemptions} >= 0 AND (${table.maxRedemptions} IS NULL OR ${table.currentRedemptions} <= ${table.maxRedemptions})`),
  promotionDatesCheck: check('check_promotion_dates', `${table.endDate} > ${table.startDate}`),
}))

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  startDatetime: timestamp('start_datetime', { withTimezone: true }).notNull(),
  endDatetime: timestamp('end_datetime', { withTimezone: true }).notNull(),
  ticketPrice: decimal('ticket_price', { precision: 10, scale: 2 }),
  maxAttendees: integer('max_attendees'),
  currentAttendees: integer('current_attendees').default(0),
  imageUrl: text('image_url'),
  externalTicketUrl: text('external_ticket_url'),
  isFeatured: boolean('is_featured').default(false),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  eventDatesCheck: check('check_event_dates', `${table.endDatetime} > ${table.startDatetime}`),
  eventCapacityCheck: check('check_event_capacity', `${table.maxAttendees} IS NULL OR ${table.maxAttendees} > 0`),
  currentAttendeesCheck: check('check_current_attendees', `${table.currentAttendees} >= 0 AND (${table.maxAttendees} IS NULL OR ${table.currentAttendees} <= ${table.maxAttendees})`),
  ticketPriceCheck: check('check_ticket_price', `${table.ticketPrice} IS NULL OR ${table.ticketPrice} >= 0`),
}))

// ============================================================================
// VIBE CHECKS AND SOCIAL FEATURES
// ============================================================================

export const vibeChecks = pgTable('vibe_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  crowdLevel: integer('crowd_level'),
  musicVolume: integer('music_volume'),
  energyLevel: integer('energy_level'),
  waitTime: integer('wait_time'),
  coverCharge: decimal('cover_charge', { precision: 10, scale: 2 }),
  notes: text('notes'),
  imageUrl: text('image_url'),
  isVerified: boolean('is_verified').default(false),
  helpfulCount: integer('helpful_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  crowdLevelCheck: check('check_crowd_level', `${table.crowdLevel} >= 1 AND ${table.crowdLevel} <= 5`),
  musicVolumeCheck: check('check_music_volume', `${table.musicVolume} >= 1 AND ${table.musicVolume} <= 5`),
  energyLevelCheck: check('check_energy_level', `${table.energyLevel} >= 1 AND ${table.energyLevel} <= 5`),
  waitTimeCheck: check('check_wait_time', `${table.waitTime} >= 0 AND ${table.waitTime} <= 480`),
  coverChargeCheck: check('check_cover_charge', `${table.coverCharge} >= 0`),
  uniqueVibeCheckPerDay: unique().on(table.venueId, table.userId, table.createdAt),
}))

export const vibeCheckReactions = pgTable('vibe_check_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  vibeCheckId: uuid('vibe_check_id').references(() => vibeChecks.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reactionType: varchar('reaction_type', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueReaction: unique().on(table.vibeCheckId, table.userId),
  reactionTypeCheck: check('reaction_type_check', `${table.reactionType} IN ('helpful', 'not_helpful')`),
}))

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').notNull(),
  title: varchar('title', { length: 255 }),
  content: text('content'),
  visitDate: date('visit_date'),
  isVerified: boolean('is_verified').default(false),
  helpfulCount: integer('helpful_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  ratingCheck: check('check_review_rating', `${table.rating} >= 1 AND ${table.rating} <= 5`),
}))

export const reviewReactions = pgTable('review_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewId: uuid('review_id').references(() => reviews.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reactionType: varchar('reaction_type', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueReaction: unique().on(table.reviewId, table.userId),
  reactionTypeCheck: check('reaction_type_check', `${table.reactionType} IN ('helpful', 'not_helpful')`),
}))

// ============================================================================
// USER INTERACTIONS
// ============================================================================

export const userFavorites = pgTable('user_favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueFavorite: unique().on(table.userId, table.venueId),
}))

export const userCheckins = pgTable('user_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'cascade' }).notNull(),
  checkinDatetime: timestamp('checkin_datetime', { withTimezone: true }).defaultNow(),
  checkoutDatetime: timestamp('checkout_datetime', { withTimezone: true }),
  isPrivate: boolean('is_private').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const userFollows = pgTable('user_follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  followerId: uuid('follower_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  followingId: uuid('following_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueFollow: unique().on(table.followerId, table.followingId),
  noSelfFollow: check('no_self_follow', `${table.followerId} != ${table.followingId}`),
}))

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data').default({}),
  isRead: boolean('is_read').default(false),
  isSent: boolean('is_sent').default(false),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueToken: unique().on(table.userId, table.token),
  platformCheck: check('platform_check', `${table.platform} IN ('ios', 'android', 'web')`),
}))

// ============================================================================
// ANALYTICS
// ============================================================================

export const venueAnalytics = pgTable('venue_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  views: integer('views').default(0),
  uniqueViews: integer('unique_views').default(0),
  checkins: integer('checkins').default(0),
  vibeChecks: integer('vibe_checks').default(0),
  reviews: integer('reviews').default(0),
  favorites: integer('favorites').default(0),
  promotionViews: integer('promotion_views').default(0),
  eventViews: integer('event_views').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueVenueDate: unique().on(table.venueId, table.date),
}))

export const userActivityLogs = pgTable('user_activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: uuid('resource_id'),
  metadata: jsonb('metadata').default({}),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ============================================================================
// ADMIN AND MODERATION
// ============================================================================

export const adminRoles = pgTable('admin_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).unique().notNull(),
  description: text('description'),
  permissions: text('permissions').array().notNull().default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const adminUserRoles = pgTable('admin_user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => adminRoles.id, { onDelete: 'cascade' }).notNull(),
  assignedBy: uuid('assigned_by').references(() => users.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true),
}, (table) => ({
  uniqueUserRole: unique().on(table.userId, table.roleId),
}))

export const moderationReports = pgTable('moderation_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
  reportedContentType: varchar('reported_content_type', { length: 50 }).notNull(),
  reportedContentId: uuid('reported_content_id').notNull(),
  reason: varchar('reason', { length: 100 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('pending'),
  moderatorId: uuid('moderator_id').references(() => users.id),
  moderatorNotes: text('moderator_notes'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  statusCheck: check('status_check', `${table.status} IN ('pending', 'reviewing', 'resolved', 'dismissed')`),
}))

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  ownedVenues: many(venues),
  vibeChecks: many(vibeChecks),
  reviews: many(reviews),
  favorites: many(userFavorites),
  checkins: many(userCheckins),
  followers: many(userFollows, { relationName: 'followers' }),
  following: many(userFollows, { relationName: 'following' }),
  notifications: many(notifications),
  pushTokens: many(pushTokens),
  activityLogs: many(userActivityLogs),
}))

export const venuesRelations = relations(venues, ({ one, many }) => ({
  owner: one(users, {
    fields: [venues.ownerId],
    references: [users.id],
  }),
  categories: many(venueCategoryMappings),
  promotions: many(promotions),
  events: many(events),
  vibeChecks: many(vibeChecks),
  reviews: many(reviews),
  favorites: many(userFavorites),
  checkins: many(userCheckins),
  analytics: many(venueAnalytics),
}))

export const vibeChecksRelations = relations(vibeChecks, ({ one, many }) => ({
  venue: one(venues, {
    fields: [vibeChecks.venueId],
    references: [venues.id],
  }),
  user: one(users, {
    fields: [vibeChecks.userId],
    references: [users.id],
  }),
  reactions: many(vibeCheckReactions),
}))

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  venue: one(venues, {
    fields: [reviews.venueId],
    references: [venues.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  reactions: many(reviewReactions),
}))

// Export all table types for use in other files
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
export type Venue = typeof venues.$inferSelect
export type NewVenue = typeof venues.$inferInsert
export type Promotion = typeof promotions.$inferSelect
export type NewPromotion = typeof promotions.$inferInsert
export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type VibeCheck = typeof vibeChecks.$inferSelect
export type NewVibeCheck = typeof vibeChecks.$inferInsert
export type Review = typeof reviews.$inferSelect
export type NewReview = typeof reviews.$inferInsert