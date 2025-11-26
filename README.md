# Torrenter

A modern, fast, and efficient movie and TV show search application built with SvelteKit. Torrenter integrates with [Jackett](https://github.com/Jackett/Jackett) to provide a unified search interface for your favorite trackers.

## Features

- **Unified Search**: Search across multiple trackers simultaneously via Jackett.
- **Rich Results**: View detailed information including title, size, seeders, peers, and publish date.
- **Magnet Links**: One-click access to magnet links.
- **Responsive Design**: Optimized for both desktop and mobile devices.
- **Dark Mode**: Sleek, eye-friendly interface.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or later)
- [Jackett](https://github.com/Jackett/Jackett) (running and configured)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/michaelrubi/torrenter.git
    cd torrenter
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory and add your Jackett configuration:
    ```env
    JACKETT_URL=http://localhost:9117
    JACKETT_API_KEY=your_jackett_api_key_here
    ```

4.  **Start the development server:**
    ```bash
    npm run dev
    ```

5.  **Build for production:**
    ```bash
    npm run build
    ```

## Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/)
- **Language**: TypeScript
- **Styling**: CSS (Custom properties)
- **Validation**: Valibot

## License

MIT
