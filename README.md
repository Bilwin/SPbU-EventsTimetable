# 📅 SPbU Events Timetable

A modern **Telegram Mini App** for viewing and managing university events at Saint Petersburg University. Built with Next.js 15, Prisma, and the Telegram Mini Apps SDK.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)

---

## ✨ Features

- 📆 Interactive weekly calendar with swipe navigation
- 🔐 Secure JWT-based authentication via Telegram initData
- 👮 Admin panel for event management (create/delete)
- 📱 Native Telegram Mini App experience

---

## 🏗️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | MariaDB + Prisma ORM |
| **Auth** | JWT + Telegram initData HMAC validation |
| **UI** | Telegram UI Kit, HeroUI Calendar |
| **Telegram SDK** | @tma.js/sdk-react |

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) & Docker Compose
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/SPbU-EventsTimetable.git
cd SPbU-EventsTimetable

# Install dependencies
pnpm install
# or
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
DATABASE_URL="mysql://prisma:prisma@127.0.0.1:3307/events"
TELEGRAM_BOT_TOKEN="your_bot_token_here"
TELEGRAM_GROUP_ID="your_group_id_here"
JWT_ACCESS_SECRET="your_access_secret_here"
JWT_REFRESH_SECRET="your_refresh_secret_here"
```

> [!IMPORTANT]
> Replace placeholder values with your actual credentials.

### Running with Docker

```bash
cd docker

# Start all services (Next.js + MariaDB)
docker compose up --build

# Or run in background
docker compose up -d
```

> [!TIP]
> The app will be available at `https://localhost:3000` (HTTPS required for Telegram Mini Apps).

### Database Setup

```bash
# Seed the database with demo events
npm run prisma:seed

# Generate Prisma client after schema changes
npm run prisma:generate
```

---

## 🗄️ Database

### Default Credentials

| Setting | Value |
|---------|-------|
| User | `prisma` |
| Password | `prisma` |
| Database | `events` |
| Root Password | `rootpass` |
| Host (from host) | `127.0.0.1:3307` |
| Host (from container) | `db:3306` |

> [!CAUTION]
> These are development credentials. Use strong secrets in production!

### Prisma Migrations

```bash
# Run migrations (requires elevated permissions for shadow database)
DATABASE_URL="mysql://root:rootpass@127.0.0.1:3307/events" npx prisma migrate dev --name <migration-name>
```

### Data Persistence

Database data is stored in the `mariadb_data` Docker volume. To reset:

```bash
docker compose down
docker volume rm spbu-main_mariadb_data
docker compose up -d
```

---

## 🛣️ API Routes

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signin` | Authenticate via Telegram initData |
| `GET` | `/api/auth/check` | Verify JWT token status |
| `POST` | `/api/auth/signout` | Clear auth cookies |

#### `POST /api/auth/signin`

Validates Telegram initData using HMAC-SHA256 and returns JWT tokens.

**Request Body:**
```json
{
  "initData": "query_id=...&user=...&auth_date=...&hash=..."
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 123456789,
    "firstName": "John",
    "isAdmin": true
  }
}
```

> [!NOTE]
> JWT tokens are stored in httpOnly cookies (`access_token`, `refresh_token`).

---

### Events

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/events` | Fetch events | Public |
| `POST` | `/api/events` | Create event | 🔐 Admin |
| `DELETE` | `/api/events?id={id}` | Delete event | 🔐 Admin |

#### `GET /api/events`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `date` | `string` | Single date (ISO format) |
| `from` | `string` | Range start date |
| `to` | `string` | Range end date |
| `weeksWithEvents` | `boolean` | Return week offsets with events |

**Example:**
```bash
# Get events for a specific date
GET /api/events?date=2026-01-18

# Get events for a date range
GET /api/events?from=2026-01-01&to=2026-01-31

# Get week offsets with events
GET /api/events?from=2026-01-01&to=2026-12-31&weeksWithEvents=true
```

#### `POST /api/events`

**Request Body:**
```json
{
  "title": "Event Title",
  "description": "Event description",
  "location": "Room 101",
  "date": "2026-01-20",
  "startTime": "14:00",
  "endTime": "16:00",
  "registerable": true,
  "registerUrl": "https://example.com/register"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | ✅ | Event title |
| `description` | `string` | ✅ | Event description |
| `location` | `string` | ✅ | Event location |
| `date` | `string` | ✅ | Date (YYYY-MM-DD) |
| `startTime` | `string` | ✅ | Start time (HH:MM) |
| `endTime` | `string` | ❌ | End time (HH:MM) |
| `registerable` | `boolean` | ❌ | Requires registration |
| `registerUrl` | `string` | ❌ | Registration link |

#### `DELETE /api/events?id={id}`

Deletes an event by ID. Requires admin authentication.

---

## 📁 Project Structure

```
├── docker/
│   ├── docker-compose.yml    # Docker services config
│   ├── Dockerfile            # Next.js container
│   └── dev-entrypoint.sh     # Container entrypoint
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── seed.js               # Demo data seeder
│   └── migrations/           # Database migrations
├── public/
│   └── locales/              # i18n translations
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   └── events/       # Events CRUD
│   │   └── page.tsx          # Main calendar page
│   ├── components/           # React components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities (Prisma, auth)
│   ├── types/                # TypeScript definitions
│   └── utils/                # Helper functions
└── certificates/             # HTTPS certificates
```

---

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run dev:https` | Start dev server with HTTPS |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:seed` | Seed database |

---

## 🔒 Security

### Authentication Flow

1. Client sends Telegram `initData` to `/api/auth/signin`
2. Server validates initData using HMAC-SHA256 with bot token
3. Server checks if user is admin of the Telegram group
4. JWT access (15min) and refresh (7d) tokens are issued
5. Tokens are stored in httpOnly secure cookies

> [!WARNING]
> Ensure `TELEGRAM_BOT_TOKEN` is kept secret. The initData validation prevents spoofing of user identity.

### Admin Authorization

Admin status is determined by checking the user's role in the configured Telegram group via the Bot API:
- `creator` or `administrator` → Admin access granted
- Others → Read-only access

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ for SPbU students</sub>
</div>
