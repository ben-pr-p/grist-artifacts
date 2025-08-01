# Grist Artifacts

## Overview

This project allows Grist users and internal app developers to quickly extend Grist’s functionality by generating AI-powered, embedded React apps (like Claude Artifacts). These apps integrate deeply with Grist features, offering robust data manipulation and visualization capabilities.

## Demo

[Demo Video - Part 1](https://www.loom.com/share/a76ccf7ea9cf4712acd7309a8c3154ce?sid=2da6719e-639d-4fbc-b769-8ab4d1e7064f)

[Demo Video - Part 2](https://www.loom.com/share/cf0b8fc9cc3448508c8721796c56e331?sid=0a35a018-bd1f-4e6e-b539-3d27a5276533)

## Key Features

- AI-Generated Apps: Uses prompts to generate React apps that leverage injected hooks for deep Grist integration.
- Data Operations: Supports bulk / custom record insertion, updating, and deletion.
- Widget Linking & Filtering: Integrates seamlessly with Grist widget linking and filtering. Generate custom searching and filtering widgets.
- Custom SQL: Allows running custom SQL queries.
- Chart Rendering: Utilizes Recharts for data visualization.
- UI/UX: Default styling with Shadcn and Tailwind CSS.
- User Configurability: Supports storing options and preferences for enhanced customization in local storage, session storage, or full all users in Grist widget options 

## Use Cases
-	Automating Data Entry: Quickly create interfaces for bulk data uploads and modifications.
-	Dashboards: Generate custom dashboards that visualize data using Recharts.
-	Advanced Filtering: Implement complex filtering mechanisms that interact with other Grist widgets.
-	Custom Workflows: Design specialized workflows that leverage Grist’s data with dedicated UIs
- Printing and reports: Generate custom print and PDF reports using React code

## Getting Started

The widget has a server for AI interaction, and as a result is available as a Docker container.

### Prerequisites
- A Docker environment (Fly, Kubernetes, etc)
- An Anthropic API key.
- An OpenRouter API key (for Morph model used in code edits).
- Your Grist base URL.

### Deployment

It's available on `ghcr.io/ben-pr-p/grist-artifacts`.

1.	Set your ANTHROPIC_API_KEY, OPENROUTER_API_KEY, and GRIST_BASE_URL as environment variables.
2.	Deploy the Docker container on your preferred platform (e.g., Fly, Kubernetes).
3.	Add a custom widget in Grist pointing to your deployed domain (e.g. `https://your-domain.fly.dev`)

## Usage
- Simply add the custom widget in Grist, pop open the AI panel, and generate an app! If you need
	it to insert into a particular table or store something as a Grist option, just ask for it.

## Troubleshooting
- AI Generation Errors: If the AI-generated code produces an error, the error message is displayed so you can troubleshoot and iterate on the prompt.
- Access Issues: Ensure the GRIST_BASE_URL and user permissions are correctly set to allow spending AI tokens. The server widget authenticates with the server by sending the logged in user's access token, which is then checked by making an API call to the provided GRIST_BASE_URL.

## How It Works

The app works by storing 2 primary pieces of information in Grist widget options.
1. the user's code (written in JSX, etc.)
2. the transformed code (the output of running Babel on the user's code)

When the widget is loaded, it loads the transformed code and generates a React comopnent from it.
It then renders it, passing to it:
- The data passed into the custom widget via props
- A set of custom React hooks that provide Grist integration capabilities, including data access, record manipulation, and widget linking functionality. These hooks are defined in the [Grist client library](https://github.com/ben-pr-p/grist-artifacts/blob/main/app/lib/grist.client.ts).

When "Open Configuration" is clicked, the widget routes to /editor, which loads the editing environment to manipulate the user's code and interact with the AI chatbot helper.

It's a separate route to keep the main widget route's code lighter (editor needs to load babel, the code editor, etc., and isn't used for most users).

## Security / Authorization

The widget uses Grist's iframe based widget API to modify and load data, which means it can only
load data that the current user has access to.

## Privacy

Interacting with the AI chatbot sends 3 records from every table to Anthropic via API.


## Contributing

There's a few bigger things to do that I'd like some help on:
- **Improving the chat UI**: take in progress streaming code out of the widget and render a pending spinner instead for code generation
- **Automatically feed errors back into the prompt**: This could just happen client side, but isn't happening yet
- **Speed up edit generation**: Either use an established AI edit format, or generate a diff using a smart model (e.g. 3.7 sonnet) and apply the diff to the original code using a fast model (e.g. haiku).