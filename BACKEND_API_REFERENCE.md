# Nexora SaaS Backend API Reference & Integration Guide

Complete API documentation, GraphQL operations, authentication flow, and seed credentials for connecting frontend applications (Next.js, React, Mobile) to the Nexora SaaS backend.

---

## 🚀 1. Server Configuration & Endpoints

| Environment | GraphQL Endpoint | Protocol | Notes |
| :--- | :--- | :--- | :--- |
| **Local Development** | `http://localhost:8000/graphql` | HTTP POST | Auto-generated schema in `src/schema.gql` |
| **Production / Cloud** | `https://your-domain.com/graphql` | HTTPS POST | CORS enabled |

### Request Headers
For authenticated requests, pass the JWT Bearer token in the `Authorization` header:
```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## 🔑 2. Demo Seed Accounts & Roles

All demo accounts use password: **`Password123!`**

| Email | Name | System Role | Default Organizations |
| :--- | :--- | :--- | :--- |
| `owner@nexora.app` | Alex Rivers | SuperAdmin / Owner | `nexora-labs` (Owner) |
| `admin@nexora.app` | Sarah Chen | Admin | `nexora-labs` (Admin), `acme-corp` (Owner) |
| `lead.dev@nexora.app` | Marcus Vance | Manager / Lead Dev | `nexora-labs` (Manager), `acme-corp` (Manager) |
| `dev@nexora.app` | Elena Rostova | Developer | `nexora-labs` (Developer), `acme-corp` (Developer) |
| `qa@nexora.app` | Liam Patel | QA Engineer | `nexora-labs` (QA) |
| `member@nexora.app` | Jordan Hayes | Member / Designer | `nexora-labs` (Designer), `acme-corp` (Member) |
| `viewer@nexora.app` | Taylor Morgan | Viewer | `nexora-labs` (Viewer) |

### Demo Organizations
- **Nexora Labs** (Slug: `nexora-labs`)
- **Acme Corporation** (Slug: `acme-corp`)

---

## 📡 3. GraphQL API Operations

### A. Authentication Module

#### Login
```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    accessToken
    refreshToken
    tokenType
    user {
      pubId
      email
      firstName
      lastName
      fullName
    }
  }
}

# Variables
{
  "input": {
    "email": "owner@nexora.app",
    "password": "Password123!"
  }
}
```

#### Register
```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    accessToken
    refreshToken
    user {
      pubId
      email
      fullName
    }
  }
}
```

#### Refresh Token
```graphql
mutation RefreshToken($input: RefreshTokenInput!) {
  refreshToken(input: $input) {
    accessToken
    refreshToken
  }
}
```

#### Current User (`me`)
```graphql
query Me {
  me {
    pubId
    email
    firstName
    lastName
    fullName
    createdAt
  }
}
```

---

### B. Organizations Module

#### Get User Organizations
```graphql
query MyOrganizations {
  myOrganizations {
    pubId
    name
    slug
    role
    memberCount
    createdAt
  }
}
```

#### Get Organization Details
```graphql
query Organization($identifier: String!) {
  organization(identifier: $identifier) {
    pubId
    name
    slug
    role
    memberCount
    createdAt
  }
}
```

#### Create Organization
```graphql
mutation CreateOrganization($input: CreateOrganizationInput!) {
  createOrganization(input: $input) {
    pubId
    name
    slug
  }
}
```

#### Add Organization Member
```graphql
mutation AddOrganizationMember($input: AddOrganizationMemberInput!) {
  addOrganizationMember(input: $input) {
    pubId
    role
    user {
      email
      fullName
    }
  }
}
```

---

### C. Teams Module

#### List Organization Teams
```graphql
query Teams($organizationPubId: String!) {
  teams(organizationPubId: $organizationPubId) {
    pubId
    name
    description
    organizationPubId
    memberCount
    createdAt
  }
}
```

#### Create Team
```graphql
mutation CreateTeam($input: CreateTeamInput!) {
  createTeam(input: $input) {
    pubId
    name
    description
    memberCount
  }
}
```

#### Add Member to Team
```graphql
mutation AddTeamMember($input: AddTeamMemberInput!) {
  addTeamMember(input: $input) {
    success
    message
  }
}
```

---

### D. Projects Module

#### List Organization Projects
```graphql
query OrganizationProjects($organizationPubId: String!) {
  organizationProjects(organizationPubId: $organizationPubId) {
    pubId
    name
    key
    description
    status
    organizationPubId
    teamPubId
    team {
      name
    }
    memberCount
    startDate
    dueDate
    createdAt
  }
}
```

#### Get Project Details
```graphql
query Project($pubId: String!) {
  project(pubId: $pubId) {
    pubId
    name
    key
    description
    status
    memberCount
    members {
      pubId
      user {
        email
        fullName
      }
      joinedAt
    }
    startDate
    dueDate
  }
}
```

#### Create Project
```graphql
mutation CreateProject($input: CreateProjectInput!) {
  createProject(input: $input) {
    pubId
    name
    key
    description
    status
  }
}

# Variables
{
  "input": {
    "organizationPubId": "nexora-labs",
    "name": "Design System & UI Library",
    "key": "DSG",
    "description": "Component library and design tokens",
    "status": "ACTIVE"
  }
}
```

---

### E. Tasks & Sprints Module (Kanban Board)

#### Fetch Project Tasks (Kanban Board)
```graphql
query ProjectTasks(
  $projectPubId: String!
  $status: TaskStatus
  $priority: TaskPriority
  $sprintPubId: String
) {
  projectTasks(
    projectPubId: $projectPubId
    status: $status
    priority: $priority
    sprintPubId: $sprintPubId
  ) {
    pubId
    title
    description
    status
    priority
    position
    dueDate
    parentTaskPubId
    creator {
      email
      fullName
    }
    assignees {
      pubId
      user {
        pubId
        email
        fullName
      }
    }
    labels {
      pubId
      name
      color
    }
    comments {
      pubId
      content
      author {
        fullName
      }
      createdAt
    }
    dependencies {
      pubId
      dependsOnTaskPubId
      type
    }
    blockedBy {
      pubId
      taskPubId
      type
    }
    subTasks {
      pubId
      title
      status
      priority
    }
    createdAt
    updatedAt
  }
}
```

#### Create Task
```graphql
mutation CreateTask($input: CreateTaskInput!) {
  createTask(input: $input) {
    pubId
    title
    status
    priority
    position
  }
}

# Variables
{
  "input": {
    "projectPubId": "prj_xxxxxx",
    "title": "Build UI Authentication components",
    "description": "Login and Register forms with validation",
    "status": "TODO",
    "priority": "HIGH",
    "assigneeUserPubIds": ["usr_xxxxxx"],
    "labelPubIds": ["lbl_xxxxxx"]
  }
}
```

#### Move / Reorder Task on Board
```graphql
mutation UpdateTaskPosition($input: UpdateTaskPositionInput!) {
  updateTaskPosition(input: $input) {
    pubId
    position
    status
  }
}

# Variables
{
  "input": {
    "taskPubId": "tsk_xxxxxx",
    "position": 10.5,
    "status": "IN_PROGRESS"
  }
}
```

#### Assign / Unassign User
```graphql
mutation AssignTask($input: AssignTaskInput!) {
  assignTask(input: $input) {
    success
    message
  }
}

mutation UnassignTask($input: UnassignTaskInput!) {
  unassignTask(input: $input) {
    success
    message
  }
}
```

#### Organization Labels
```graphql
query OrganizationLabels($organizationPubId: String!) {
  organizationLabels(organizationPubId: $organizationPubId) {
    pubId
    name
    color
  }
}

mutation CreateLabel($input: CreateLabelInput!) {
  createLabel(input: $input) {
    pubId
    name
    color
  }
}
```

#### Task Comments
```graphql
query TaskComments($taskPubId: String!) {
  taskComments(taskPubId: $taskPubId) {
    pubId
    content
    author {
      fullName
      email
    }
    createdAt
  }
}

mutation CreateTaskComment($input: CreateTaskCommentInput!) {
  createTaskComment(input: $input) {
    pubId
    content
    author {
      fullName
    }
    createdAt
  }
}
```

#### Task Dependencies (Blockers)
```graphql
mutation AddTaskDependency($input: AddTaskDependencyInput!) {
  addTaskDependency(input: $input) {
    pubId
    taskPubId
    dependsOnTaskPubId
    type
  }
}

mutation RemoveTaskDependency($input: RemoveTaskDependencyInput!) {
  removeTaskDependency(input: $input) {
    success
    message
  }
}
```

#### Project Sprints
```graphql
query ProjectSprints($projectPubId: String!, $status: SprintStatus) {
  projectSprints(projectPubId: $projectPubId, status: $status) {
    pubId
    name
    goal
    status
    startDate
    endDate
    taskCount
  }
}

mutation CreateSprint($input: CreateSprintInput!) {
  createSprint(input: $input) {
    pubId
    name
    goal
    status
    startDate
    endDate
  }
}
```

---

## 📂 4. How to Bootstrap Frontend in a Separate Folder

When you create your separate frontend repository / folder:

1. **Copy GraphQL Schema**:
   Copy [`src/schema.gql`](file:///home/mezba132/Mezba/nexora/src/schema.gql) into your frontend project (e.g. `src/graphql/schema.gql`).
2. **Environment Variable**:
   In your frontend `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/graphql
   ```
3. **Start Backend Server**:
   From this backend folder, keep the server running:
   ```bash
   npm run start:dev
   ```
4. **All endpoints, inputs, types, and sample credentials above are immediately ready to use!**
