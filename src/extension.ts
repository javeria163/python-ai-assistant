import * as vscode from 'vscode';
import axios from 'axios';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroq(prompt: string, system: string): Promise<string> {
    const config = vscode.workspace.getConfiguration('pythonAI');
    const GROQ_API_KEY = config.get<string>('groqApiKey');

    if (!GROQ_API_KEY) {
        vscode.window.showErrorMessage('No Groq API key found. Go to Settings → search "pythonAI" → enter your key.');
        return 'Error: No API key configured.';
    }

    try {
        const response = await axios.post(GROQ_URL, {
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.3
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        return 'Error connecting to AI. Check your API key.';
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Python AI Assistant is now active!');

    const explainCommand = vscode.commands.registerCommand('python-ai-assistant.explain', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const selectedText = editor.document.getText(editor.selection);
        if (!selectedText) {
            vscode.window.showInformationMessage('Please select some code first!');
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '🤖 AI is analyzing your code...',
            cancellable: false
        }, async () => {
            const explanation = await callGroq(
                `Explain this Python code clearly and concisely:\n\n${selectedText}`,
                'You are an expert Python developer. Explain code clearly for developers. Be concise.'
            );
            const panel = vscode.window.createWebviewPanel('pythonAI', 'AI Explanation', vscode.ViewColumn.Beside, {});
            panel.webview.html = getWebviewContent('Code Explanation', explanation, '🔍');
        });
    });

    const fixCommand = vscode.commands.registerCommand('python-ai-assistant.fix', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const selectedText = editor.document.getText(editor.selection);
        if (!selectedText) {
            vscode.window.showInformationMessage('Please select some code first!');
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '🤖 AI is fixing your code...',
            cancellable: false
        }, async () => {
            const fixed = await callGroq(
                `Fix and improve this Python code. Return ONLY the fixed code, no explanation:\n\n${selectedText}`,
                'You are an expert Python developer. Fix bugs, improve readability, follow PEP8. Return only code.'
            );
            const panel = vscode.window.createWebviewPanel('pythonAIFix', 'AI Fixed Code', vscode.ViewColumn.Beside, {});
            panel.webview.html = getWebviewContent('Fixed Code', fixed, '✅');
        });
    });

    const securityCommand = vscode.commands.registerCommand('python-ai-assistant.security', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const selectedText = editor.document.getText(editor.selection) || editor.document.getText();
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '🛡️ Scanning for security issues...',
            cancellable: false
        }, async () => {
            const issues = await callGroq(
                `Find security vulnerabilities in this Python code. List each issue with line number and fix:\n\n${selectedText}`,
                'You are a security expert. Find SQL injection, XSS, hardcoded secrets, command injection, and other vulnerabilities. Be specific.'
            );
            const panel = vscode.window.createWebviewPanel('pythonAISecurity', 'Security Scan', vscode.ViewColumn.Beside, {});
            panel.webview.html = getWebviewContent('Security Scan Results', issues, '🛡️');
        });
    });

    const docstringCommand = vscode.commands.registerCommand('python-ai-assistant.docstring', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const selectedText = editor.document.getText(editor.selection);
        if (!selectedText) {
            vscode.window.showInformationMessage('Please select a function first!');
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '📝 Generating docstring...',
            cancellable: false
        }, async () => {
            const docstring = await callGroq(
                `Generate a Google-style Python docstring for this function. Return ONLY the docstring:\n\n${selectedText}`,
                'You are an expert Python developer. Generate clear, complete Google-style docstrings.'
            );
            const panel = vscode.window.createWebviewPanel('pythonAIDoc', 'Generated Docstring', vscode.ViewColumn.Beside, {});
            panel.webview.html = getWebviewContent('Generated Docstring', docstring, '📝');
        });
    });

    const chatCommand = vscode.commands.registerCommand('python-ai-assistant.chat', async () => {
        const question = await vscode.window.showInputBox({
            prompt: 'Ask your Python AI assistant anything...',
            placeHolder: 'e.g. How do I read a CSV file in Python?'
        });
        if (!question) return;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '🤖 AI is thinking...',
            cancellable: false
        }, async () => {
            const answer = await callGroq(
                question,
                'You are an expert Python developer and teacher. Answer Python questions clearly with code examples.'
            );
            const panel = vscode.window.createWebviewPanel('pythonAIChat', 'AI Answer', vscode.ViewColumn.Beside, {});
            panel.webview.html = getWebviewContent('AI Answer', answer, '💬');
        });
    });

    context.subscriptions.push(explainCommand, fixCommand, securityCommand, docstringCommand, chatCommand);
}

function getWebviewContent(title: string, content: string, emoji: string): string {
    const escapedContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { 
            font-family: 'Segoe UI', sans-serif; 
            padding: 20px; 
            background: #0d1117; 
            color: #e6edf3;
            line-height: 1.6;
        }
        h1 { color: #58a6ff; margin-bottom: 20px; }
        pre { 
            background: #161b22; 
            padding: 16px; 
            border-radius: 8px; 
            overflow-x: auto;
            border: 1px solid #30363d;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        code { color: #79c0ff; }
    </style>
</head>
<body>
    <h1>${emoji} ${title}</h1>
    <pre>${escapedContent}</pre>
</body>
</html>`;
}

export function deactivate() {}