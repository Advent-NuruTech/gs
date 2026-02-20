# AdventSkool LMS

Production-ready, modular LMS built with Next.js App Router, Firebase Auth + Firestore (REST integration), and Cloudinary uploads.

## Stack

- Next.js App Router (React 19)
- Firebase Auth + Firestore (via REST-compatible `firebase/*` local shim)
- Cloudinary image uploads
- TypeScript + ESLint

## Features

- Role-based dashboards: `student`, `teacher`, `admin`
- Course upload:
  - title
  - original price
  - discounted price
  - Cloudinary thumbnail upload
  - rich text outline
  - dynamic unlimited lesson creation
- Lesson management:
  - title
  - rich text content editor (bold, italic, underline, color, lists, size, links)
  - Cloudinary image upload
  - video URL
  - automatic YouTube ID extraction
  - link detection in notes/content
  - quiz questions per lesson
- Enrollment and progress:
  - `enrollments/{userId_courseId}`
  - completion tracking
  - progress percentage
  - sequential lesson unlock logic
- Scalable architecture:
  - service layer
  - reusable hooks
  - modular components
  - Firestore-style subcollections for lessons
- Firestore security rules included at `lib/firebase/securityRules.txt`

## Project Structure

The structure matches the LMS architecture requested across:

- `app/` route groups for public/auth/dashboard
- `components/` split by `ui`, `course`, and `dashboard`
- `services/` for business logic and Firestore access
- `hooks/`, `context/`, `lib/`, and `types/`
- `middleware.ts` for role route protection

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

## Run

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run lint
```

## Notes

- In this environment, package download is cache-restricted, so Firebase is integrated through local `firebase/*` compatibility modules in `lib/firebase/sdk/*` that call Firebase REST APIs.
- Next.js currently warns that `middleware.ts` convention is deprecated in favor of `proxy.ts` in newer versions.
