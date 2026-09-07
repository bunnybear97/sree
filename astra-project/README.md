# Astra Chat

A minimal command-line chatbot.

## Setup

```bash
cd astra-project
pip install -r requirements.txt
export OPENAI_API_KEY=your-api-key-here
export OPENAI_MODEL=gpt-6-astra   # or whatever model string your API access uses
python3 chat.py
```

## Notes

`OPENAI_MODEL` defaults to `gpt-6-astra`. If your API key/access uses a
different model identifier, set `OPENAI_MODEL` accordingly — the script
doesn't hardcode anything else about the model.
