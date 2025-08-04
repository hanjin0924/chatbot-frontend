This is the [assistant-ui](https://github.com/Yonom/assistant-ui) starter project.

## Getting Started

First, add your OpenAI API key to `.env.local` file:

```
AZURE_RESOURCE_NAME=""      # Azure OpenAI Resource Name
AZURE_API_KEY=""            # Azure OpenAI API Key
AZURE_MODEL_NAME=""         # Azure OpenAI Model Name

AZURE_SEARCH_ENDPOINT=""    # Azure AI Search Endpoint
AZURE_SEARCH_KEY=""         # Azure AI Search API Key
AZURE_SEARCH_INDEX_NAME=""  # Azure AI Search Index Name
AZURE_SEARCH_SEMANTIC_CONFIG_NAME=""
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
