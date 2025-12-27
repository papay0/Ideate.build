# Ideate

An open-source AI-powered prototyping tool that creates interactive mobile and desktop app prototypes in real-time. Describe your app idea, watch it come to life, and test it with working navigation.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Interactive Prototypes** - Generate clickable prototypes with working navigation between screens
- **Real-time Streaming** - Watch your screens generate token-by-token with live preview
- **Play Mode** - Test your prototype with full-screen interactive navigation
- **BYOK (Bring Your Own Key)** - Use your own API keys from OpenRouter or Google Gemini
- **2D Grid Canvas** - Screens laid out intelligently showing app flow and relationships
- **Phone/Desktop Mockups** - See prototypes in realistic device frames
- **Inline Editing** - Request changes to specific screens and watch them update in place
- **Flow Connections** - Visual arrows showing navigation between screens
- **Conversation History** - AI remembers context for iterative refinement
- **Project Management** - Organize prototypes with custom names and emoji icons
- **Persistent Storage** - All projects saved to Supabase
- **Public Sharing** - Share interactive prototypes via public URLs

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org) with App Router |
| UI | [React 19](https://react.dev) + [Tailwind CSS 4](https://tailwindcss.com) |
| AI | [Vercel AI SDK](https://sdk.vercel.ai) with streaming |
| LLM Providers | [OpenRouter](https://openrouter.ai) / [Google Gemini](https://ai.google.dev) |
| Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Auth | [Clerk](https://clerk.com) |
| Canvas | [react-zoom-pan-pinch](https://github.com/BetterTyped/react-zoom-pan-pinch) |
| Animations | [Framer Motion](https://www.framer.com/motion) |
| Icons | [Lucide React](https://lucide.dev) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Supabase account (free tier works)
- Clerk account (free tier works)
- OpenRouter or Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/papay0/opendesign.git
cd opendesign
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### 4. Set up the database

Run the prototype migrations in your Supabase SQL Editor to create the required tables:
- `prototype_projects` - User prototype projects
- `prototype_screens` - Generated screen HTML with grid positions
- `prototype_messages` - Chat history for context

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Configure your API key

1. Sign in to Ideate
2. Go to **Settings** (gear icon)
3. Enter your OpenRouter or Gemini API key
4. Start prototyping!

## Usage

### Creating a New Prototype

1. Enter your app idea on the home page (e.g., "A fitness tracking app with workout plans")
2. Watch as the AI generates 5-8 interactive screens in real-time
3. Screens are arranged in a 2D grid showing the app flow
4. Use the canvas controls to zoom and pan

### Testing Your Prototype

1. Click the **Play** button to enter interactive mode
2. Navigate between screens by clicking buttons and links
3. Test the user flow just like a real app
4. Exit play mode to continue editing

### Editing Existing Screens

Simply describe what you want to change:

> "Make the header gradient purple instead of blue"

> "Add a profile avatar to the top right corner"

> "Replace the chart with a progress ring"

The AI will identify the relevant screen and update it inline.

### Canvas Controls

| Action | Control |
|--------|---------|
| Pan | Scroll / Drag |
| Zoom | Pinch / Scroll wheel |
| Reset | Click reset button |

## Architecture

```
app/
├── api/ai/generate-prototype/    # Streaming AI endpoint
├── home/
│   ├── components/
│   │   ├── prototype/
│   │   │   ├── PrototypeCanvas.tsx   # 2D grid canvas
│   │   │   ├── PrototypePlayer.tsx   # Interactive play mode
│   │   │   └── FlowConnections.tsx   # Navigation arrows
│   │   ├── StreamingScreenPreview.tsx  # SSE parser & state
│   │   └── ExportMenu.tsx            # PNG/ZIP export
│   ├── prototypes/[id]/              # Prototype editor page
│   └── settings/                     # API key configuration
├── p/[id]/                           # Public prototype viewer
├── sign-in/                          # Clerk auth
└── sign-up/
```

### Streaming Protocol

The AI uses HTML comment delimiters with grid positions:

```html
<!-- PROJECT_NAME: My App -->
<!-- PROJECT_ICON: rocket -->
<!-- MESSAGE: Here's your interactive prototype! -->
<!-- SCREEN_START: Home [0,0] [ROOT] -->
<div class="min-h-screen bg-gradient-to-b...">
  <a href="#screen-profile" data-flow="screen-profile">Profile</a>
</div>
<!-- SCREEN_END -->
<!-- SCREEN_START: Profile [1,0] -->
...
<!-- SCREEN_END -->
```

- `[col,row]` - Grid position for canvas layout
- `[ROOT]` - Marks the entry point screen
- `data-flow="screen-target"` - Navigation links between screens

## API Key Providers

### OpenRouter (Recommended)

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Generate an API key
3. Get access to multiple models including Gemini, Claude, GPT-4

### Google Gemini

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Generate an API key
3. Direct access to Gemini models

**Note:** Your API key is stored locally in your browser and sent directly to the provider. It is never stored on our servers.

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/papay0/opendesign)

1. Click the button above
2. Connect your GitHub account
3. Add environment variables
4. Deploy!

### Other Platforms

Ideate is a standard Next.js app and can be deployed to any platform that supports Node.js:

- [Railway](https://railway.app)
- [Render](https://render.com)
- [Fly.io](https://fly.io)
- [AWS Amplify](https://aws.amazon.com/amplify/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Inspired by [v0.dev](https://v0.dev) and [Figma](https://figma.com)
- Built with the amazing [Vercel AI SDK](https://sdk.vercel.ai)
- UI components styled with [Tailwind CSS](https://tailwindcss.com)

---

<p align="center">
  Made with AI assistance by <a href="https://github.com/papay0">@papay0</a>
</p>
