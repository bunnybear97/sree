#!/usr/bin/env python3
"""Simple command-line chatbot using the OpenAI-compatible API."""

import os
import sys

from openai import OpenAI

MODEL = os.environ.get("OPENAI_MODEL", "gpt-6-astra")


def main() -> None:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        sys.exit("Set OPENAI_API_KEY in your environment before running this.")

    client = OpenAI(api_key=api_key)
    messages = [{"role": "system", "content": "You are a helpful assistant."}]

    print(f"Chatting with {MODEL}. Type 'exit' to quit.\n")
    while True:
        user_input = input("You: ").strip()
        if user_input.lower() in ("exit", "quit"):
            break
        if not user_input:
            continue

        messages.append({"role": "user", "content": user_input})
        response = client.chat.completions.create(model=MODEL, messages=messages)
        reply = response.choices[0].message.content
        print(f"\n{MODEL}: {reply}\n")
        messages.append({"role": "assistant", "content": reply})


if __name__ == "__main__":
    main()
