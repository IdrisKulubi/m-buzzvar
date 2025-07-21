# Live Vibe Check Requirements Document

## Introduction

The Live Vibe Check feature enables users to share and view real-time updates about the current atmosphere and experience at venues. This feature transforms the app from a static venue discovery tool into a dynamic, community-driven platform where users can make informed decisions based on current conditions at nightlife venues.

## Requirements

### Requirement 1

**User Story:** As a user, I want to see real-time "vibe checks" from others at a venue so that I can know what the atmosphere (e.g., busyness, music, queue length) is like right now before I go.

#### Acceptance Criteria

1. WHEN I view a venue's detail page THEN the system SHALL display recent vibe checks from the last 4 hours
2. WHEN I view the main venue feed THEN the system SHALL highlight venues with recent vibe checks posted within the last 2 hours
3. WHEN I view a vibe check THEN the system SHALL display the poster's name, timestamp, busyness rating (1-5 scale), optional photo, and text comment
4. WHEN no recent vibe checks exist for a venue THEN the system SHALL display a message encouraging users to post the first vibe check
5. WHEN I view vibe checks THEN the system SHALL sort them by recency with newest first

### Requirement 2

**User Story:** As a user, I want to post my own vibe check (a short comment, photo, and busyness rating) when I'm physically at a venue so that I can share the current experience with the community.

#### Acceptance Criteria

1. WHEN I am within 100 meters of a venue THEN the system SHALL enable the "Post Vibe Check" button
2. WHEN I am more than 100 meters from a venue THEN the system SHALL disable vibe check posting for that venue
3. WHEN I post a vibe check THEN the system SHALL require a busyness rating from 1-5 (1=Dead, 2=Quiet, 3=Moderate, 4=Busy, 5=Packed)
4. WHEN I post a vibe check THEN the system SHALL allow an optional text comment up to 280 characters
5. WHEN I post a vibe check THEN the system SHALL allow an optional photo upload
6. WHEN I submit a vibe check THEN the system SHALL save it with my user ID, venue ID, current timestamp, and location verification
7. WHEN I try to post multiple vibe checks for the same venue THEN the system SHALL only allow one vibe check per user per venue per hour

### Requirement 3

**User Story:** As a user, I want to see which venues have recent vibe checks highlighted in the main feed so that I can easily discover places with current activity.

#### Acceptance Criteria

1. WHEN I view the main venue feed THEN the system SHALL display a "Live" indicator on venue cards that have vibe checks from the last 2 hours
2. WHEN I view the main venue feed THEN the system SHALL show the most recent vibe check's busyness rating as a visual indicator
3. WHEN I tap on a venue with recent vibe checks THEN the system SHALL navigate to the venue detail page with vibe checks prominently displayed
4. WHEN I view the venue feed THEN the system SHALL prioritize venues with recent vibe checks in the sorting algorithm

### Requirement 4

**User Story:** As a user, I want to view a dedicated live feed of all recent vibe checks across venues so that I can see what's happening right now in the nightlife scene.

#### Acceptance Criteria

1. WHEN I access the Live tab THEN the system SHALL display all vibe checks from the last 4 hours across all venues
2. WHEN I view the live feed THEN the system SHALL group vibe checks by venue with the venue name and image prominently displayed
3. WHEN I view the live feed THEN the system SHALL refresh automatically every 30 seconds to show new vibe checks
4. WHEN I tap on a vibe check in the live feed THEN the system SHALL navigate to that venue's detail page
5. WHEN no recent vibe checks exist THEN the system SHALL display an encouraging message to be the first to post

### Requirement 5

**User Story:** As a venue owner or staff member, I want to see analytics about vibe checks posted at my venue so that I can understand customer perception and peak times.

#### Acceptance Criteria

1. WHEN I access venue analytics THEN the system SHALL display average busyness ratings over time periods (hourly, daily, weekly)
2. WHEN I view vibe check analytics THEN the system SHALL show the total number of vibe checks received per day
3. WHEN I view analytics THEN the system SHALL display common keywords from vibe check comments
4. WHEN I view analytics THEN the system SHALL show peak activity times based on vibe check frequency
5. IF I am not a verified venue owner THEN the system SHALL restrict access to venue analytics

### Requirement 6

**User Story:** As a user, I want to receive notifications about vibe checks at my bookmarked venues so that I can stay informed about places I'm interested in.

#### Acceptance Criteria

1. WHEN a vibe check is posted at a venue I've bookmarked THEN the system SHALL send me a push notification if I've enabled them
2. WHEN I receive a vibe check notification THEN the system SHALL include the venue name and busyness rating
3. WHEN I tap on a vibe check notification THEN the system SHALL navigate directly to that venue's detail page
4. WHEN I access notification settings THEN the system SHALL allow me to enable/disable vibe check notifications per bookmarked venue
5. WHEN multiple vibe checks are posted quickly THEN the system SHALL batch notifications to avoid spam (max 1 per venue per hour)