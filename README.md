# Grist Artifacts

## Overview

This project allows Grist users and internal app developers to quickly extend Grist’s functionality by generating AI-powered, embedded React apps (like Claude Artifacts). These apps integrate deeply with Grist features, offering robust data manipulation and visualization capabilities.

## Demo

[![Demo Video - Part 1](https://cdn.loom.com/sessions/thumbnails/a76ccf7ea9cf4712acd7309a8c3154ce-with-play.gif)](https://www.loom.com/share/a76ccf7ea9cf4712acd7309a8c3154ce?sid=2da6719e-639d-4fbc-b769-8ab4d1e7064f)

[![Demo Video - Part 2](https://cdn.loom.com/sessions/thumbnails/cf0b8fc9cc3448508c8721796c56e331-with-play.gif)](https://www.loom.com/share/cf0b8fc9cc3448508c8721796c56e331?sid=0a35a018-bd1f-4e6e-b539-3d27a5276533)

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
- Your Grist base URL.

### Deployment

It's available on `ghcr.io/ben-pr-p/grist-artifacts`.

1.	Set your ANTHROPIC_API_KEY and GRIST_BASE_URL as environment variables.
2.	Deploy the Docker container on your preferred platform (e.g., Fly, Kubernetes).
3.	Add a custom widget in Grist pointing to your deployed domain (e.g. `https://your-domain.fly.dev`)

Usage
- Simply add the custom widget in Grist, pop open the AI panel, and generate an app! If you need
	it to insert into a particular table or store something as a Grist option, just ask for it.

Troubleshooting
- AI Generation Errors: If the AI-generated code produces an error, the error message is displayed so you can troubleshoot and iterate on the prompt.
- Access Issues: Ensure the GRIST_BASE_URL and user permissions are correctly set to allow spending AI tokens. The server widget authenticates with the server by sending the logged in user's access token, which is then checked by making an API call to the provided GRIST_BASE_URL.
