# SQL Chat

A web application with a chatbot widget that connects to an n8n webhook.

## Features

- Modern UI with a fun central placeholder
- Chatbot widget on the right side of the screen
- Integration with n8n webhook for processing user questions
- Responsive design using Tailwind CSS

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Configure the n8n webhook URL:
   - Open `app/components/ChatWidget.tsx`
   - Replace the `N8N_WEBHOOK_URL` value with your actual n8n webhook URL

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application

## n8n Integration

This application sends user questions to an n8n webhook and displays the response. The webhook should be configured to:

1. Accept POST requests with a JSON body containing a `message` field
2. Process the user's question
3. Return a JSON response with a `response` field containing the answer

## Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- Axios for HTTP requests 