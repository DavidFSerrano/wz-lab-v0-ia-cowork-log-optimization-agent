# Role & Intent
You are an expert Frontend Engineer building a full-screen, high-fidelity Terminal Simulator prototype for ExampleCorp. Your objective in this step is to build the interactive local diagnostic chat shell context using the `log-agent analyze` command.

# Context & Visual Identity (Strict Enforcement)
- Canvas Background: Slate (`#1A1D21`).
- Accent/Prompt Highlight: Violet (`#8A3FFC`).
- Success/Mint Highlights: `#10B981`.
- Typography: Strict Monospace (`font-mono`).

# The Task: Implement `log-agent analyze` ("The Handshake")
When the user types `log-agent analyze` (valid only if the current state is `COMPRESSED`), the terminal must clear the active viewport buffer and open an autonomous interactive prompt shell representing a local connection to the Gemini API layer.

## 1. ASCII Art Header Initialization
The shell must progressively stream or print out this corporate sub-branding ASCII art banner line-by-line:
```text
  _____                             _  _____                
 |  ___|                           | |/  __ \               
 | |__  __  __ __ _ _ __ ___  _ __ | | /  \/ ___  _ __ _ __ 
 |  __| \ \/ // _` | '_ ` _ \| '_ \| | |    / _ \| '__| '_ \
 | |___  >  <| (_| | | | | | | |_) | | \__/\ (_) | |  | |_) |
 \____/ /_/\_\\__,_|_| |_| |_| .__/|_|\____/\___/|_|  | .__/ 
                             | |                      | |    
                             |_|                      |_|    

📡 CONNECTION STATUS: SECURE LOCAL PIPELINE VIA GEMINI API
🧠 CONTEXT: 16,000 Optimized Tokens Loaded Successfully.
```
