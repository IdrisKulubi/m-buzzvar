# Web Admin Portal Requirements Document

## Introduction

The Web Admin Portal is a Next.js web application that provides venue owners and platform administrators with comprehensive management capabilities for the Buzzvar platform. This portal enables venue owners to manage their venue information, promotions, and analytics, while providing platform administrators with full system oversight and user management capabilities. The portal shares the same Supabase database as the mobile app, ensuring real-time synchronization of all data.

## Requirements

### Requirement 1

**User Story:** As a venue owner, I want to authenticate using Google OAuth and access my venue management dashboard so that I can manage my venue's presence on the platform.

#### Acceptance Criteria

1. WHEN I visit the web portal THEN the system SHALL display a Google OAuth login option
2. WHEN I authenticate successfully THEN the system SHALL redirect me to my venue dashboard
3. WHEN I am not yet associated with a venue THEN the system SHALL display a venue registration form
4. WHEN I complete venue registration THEN the system SHALL create my venue record and associate it with my user account
5. WHEN I return to the portal THEN the system SHALL remember my authentication and display my dashboard directly

### Requirement 2

**User Story:** As a venue owner, I want to manage my venue's basic information, location, and media so that customers can discover and learn about my venue.

#### Acceptance Criteria

1. WHEN I access my venue dashboard THEN the system SHALL display my current venue information in an editable form
2. WHEN I update venue details (name, description, address, hours, contact) THEN the system SHALL save changes to the database immediately
3. WHEN I upload venue images THEN the system SHALL store them in Supabase Storage and update the venue record
4. WHEN I upload a cover video THEN the system SHALL store it in Supabase Storage and update the venue record
5. WHEN I set venue location THEN the system SHALL allow me to either enter coordinates manually or use an address lookup
6. WHEN I save changes THEN the system SHALL display a success confirmation and the mobile app SHALL reflect updates immediately

### Requirement 3

**User Story:** As a venue owner, I want to create and manage promotions and special events so that I can attract customers and increase engagement.

#### Acceptance Criteria

1. WHEN I access the promotions section THEN the system SHALL display all my current and past promotions
2. WHEN I create a new promotion THEN the system SHALL require title, description, start date, end date, and promotion type
3. WHEN I create a promotion THEN the system SHALL allow me to set specific days of the week and time ranges
4. WHEN I save a promotion THEN the system SHALL validate dates and display it in the mobile app feed immediately
5. WHEN I edit an active promotion THEN the system SHALL update it in real-time across all platforms
6. WHEN I delete a promotion THEN the system SHALL remove it from all displays and mark it as inactive

### Requirement 4

**User Story:** As a venue owner, I want to view analytics about my venue's performance and customer engagement so that I can make informed business decisions.

#### Acceptance Criteria

1. WHEN I access the analytics dashboard THEN the system SHALL display venue views, bookmarks, and vibe check statistics
2. WHEN I view analytics THEN the system SHALL show data for different time periods (daily, weekly, monthly)
3. WHEN I view vibe check analytics THEN the system SHALL display average busyness ratings and comment trends
4. WHEN I view customer engagement THEN the system SHALL show peak activity times and user interaction patterns
5. WHEN I export analytics THEN the system SHALL provide downloadable reports in CSV format

### Requirement 5

**User Story:** As a platform administrator, I want to access an admin dashboard with elevated privileges so that I can manage the entire platform effectively.

#### Acceptance Criteria

1. WHEN I authenticate with an admin email address THEN the system SHALL grant me administrator access
2. WHEN I access the admin dashboard THEN the system SHALL display platform-wide statistics and management options
3. WHEN I view the admin dashboard THEN the system SHALL show total users, venues, vibe checks, and system health metrics
4. IF my email is not in the admin list THEN the system SHALL restrict access to venue owner features only
5. WHEN I access admin features THEN the system SHALL log all administrative actions for audit purposes

### Requirement 6

**User Story:** As a platform administrator, I want to manage all venues on the platform so that I can maintain quality and handle disputes.

#### Acceptance Criteria

1. WHEN I access venue management THEN the system SHALL display all venues with search and filter capabilities
2. WHEN I select a venue THEN the system SHALL allow me to edit all venue information regardless of ownership
3. WHEN I need to moderate content THEN the system SHALL allow me to hide or delete inappropriate venue content
4. WHEN I delete a venue THEN the system SHALL cascade delete all related data (promotions, vibe checks, bookmarks)
5. WHEN I approve a new venue THEN the system SHALL make it visible in the mobile app feed

### Requirement 7

**User Story:** As a platform administrator, I want to manage all users on the platform so that I can handle support requests and maintain community standards.

#### Acceptance Criteria

1. WHEN I access user management THEN the system SHALL display all users with search and filter capabilities
2. WHEN I view a user profile THEN the system SHALL show their activity history, venues bookmarked, and vibe checks posted
3. WHEN I need to moderate a user THEN the system SHALL allow me to suspend or delete user accounts
4. WHEN I delete a user THEN the system SHALL handle data cleanup while preserving venue analytics integrity
5. WHEN I view user analytics THEN the system SHALL show registration trends and engagement metrics

### Requirement 8

**User Story:** As a platform administrator, I want to view comprehensive platform analytics so that I can monitor growth and identify trends.

#### Acceptance Criteria

1. WHEN I access platform analytics THEN the system SHALL display user growth, venue adoption, and engagement metrics
2. WHEN I view analytics THEN the system SHALL show real-time data with automatic refresh capabilities
3. WHEN I analyze trends THEN the system SHALL provide charts and graphs for visual data representation
4. WHEN I need detailed reports THEN the system SHALL allow me to export comprehensive analytics data
5. WHEN I monitor system health THEN the system SHALL display database performance and API usage statistics

### Requirement 9

**User Story:** As any portal user, I want the interface to be responsive and maintain the same clean, minimal design as the mobile app so that I have a consistent brand experience.

#### Acceptance Criteria

1. WHEN I access the portal on any device THEN the system SHALL display a responsive interface that works on desktop, tablet, and mobile
2. WHEN I navigate the portal THEN the system SHALL maintain consistent styling with the mobile app's design language
3. WHEN I interact with forms and buttons THEN the system SHALL provide immediate feedback and loading states
4. WHEN I use the portal THEN the system SHALL support both light and dark themes matching user preferences
5. WHEN I encounter errors THEN the system SHALL display user-friendly error messages with clear next steps

### Requirement 10

**User Story:** As a portal user, I want real-time synchronization with the mobile app so that changes I make are immediately reflected across all platforms.

#### Acceptance Criteria

1. WHEN I update venue information THEN the system SHALL immediately sync changes to the mobile app database
2. WHEN I create or modify promotions THEN the system SHALL make them available in the mobile app within seconds
3. WHEN mobile users interact with my venue THEN the system SHALL update my analytics dashboard in real-time
4. WHEN I upload new media THEN the system SHALL make it available in the mobile app feed immediately
5. WHEN database conflicts occur THEN the system SHALL handle them gracefully and notify me of any issues