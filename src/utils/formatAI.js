/**
 * Strips emoji characters from a string.
 */
function stripEmojis(text) {
    return text
        .replace(
            /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F700}-\u{1F77F}|\u{1F780}-\u{1F7FF}|\u{1F800}-\u{1F8FF}|\u{1F900}-\u{1F9FF}|\u{1FA00}-\u{1FA6F}|\u{1FA70}-\u{1FAFF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{FE00}-\u{FE0F}|\u{1F1E0}-\u{1F1FF}|\u{231A}-\u{231B}|\u{23E9}-\u{23F3}|\u{23F8}-\u{23FA}|\u{25AA}-\u{25AB}|\u{25B6}|\u{25C0}|\u{25FB}-\u{25FE}|\u{2614}-\u{2615}|\u{2648}-\u{2653}|\u{267F}|\u{2693}|\u{26A1}|\u{26AA}-\u{26AB}|\u{26BD}-\u{26BE}|\u{26C4}-\u{26C5}|\u{26CE}|\u{26D4}|\u{26EA}|\u{26F2}-\u{26F3}|\u{26F5}|\u{26FA}|\u{26FD}|\u{2702}|\u{2705}|\u{2708}-\u{270D}|\u{270F}|\u{2712}|\u{2714}|\u{2716}|\u{271D}|\u{2721}|\u{2728}|\u{2733}-\u{2734}|\u{2744}|\u{2747}|\u{274C}|\u{274E}|\u{2753}-\u{2755}|\u{2757}|\u{2763}-\u{2764}|\u{2795}-\u{2797}|\u{27A1}|\u{27B0}|\u{27BF}|\u{2934}-\u{2935}|\u{2B05}-\u{2B07}|\u{2B1B}-\u{2B1C}|\u{2B50}|\u{2B55}|\u{3030}|\u{303D}|\u{3297}|\u{3299}|\u{00A9}|\u{00AE}|\u{203C}|\u{2049}|\u{0023}\u{FE0F}\u{20E3}|\u{002A}\u{FE0F}\u{20E3}]/gu,
            ''
        )
        .replace(/[\u{E0000}-\u{E007F}]/gu, '') // Tags block
        .trim();
}

/**
 * Escapes HTML special characters to prevent XSS.
 */
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Converts raw AI markdown text to structured HTML.
 * Handles: **bold**, *italic*, # headings, - bullets, 1. numbered lists, line breaks.
 * Strips emojis.
 */
export function formatAIResponse(raw) {
    if (!raw) return '';

    // 1. Strip emojis
    let text = stripEmojis(raw);

    // 2. Split into lines for block-level processing
    const lines = text.split('\n');
    const outputParts = [];

    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();

        // Skip blank lines (we'll handle spacing via CSS)
        if (line === '') {
            i++;
            continue;
        }

        // ### Heading 3
        if (/^###\s+/.test(line)) {
            const content = inlineFormat(line.replace(/^###\s+/, ''));
            outputParts.push(`<h3 class="ai-h3">${content}</h3>`);
            i++;
            continue;
        }

        // ## Heading 2
        if (/^##\s+/.test(line)) {
            const content = inlineFormat(line.replace(/^##\s+/, ''));
            outputParts.push(`<h2 class="ai-h2">${content}</h2>`);
            i++;
            continue;
        }

        // # Heading 1
        if (/^#\s+/.test(line)) {
            const content = inlineFormat(line.replace(/^#\s+/, ''));
            outputParts.push(`<h1 class="ai-h1">${content}</h1>`);
            i++;
            continue;
        }

        // Bullet list: lines starting with - , * , or •
        if (/^[-*•]\s+/.test(line)) {
            const items = [];
            while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
                items.push(`<li>${inlineFormat(lines[i].trim().replace(/^[-*•]\s+/, ''))}</li>`);
                i++;
            }
            outputParts.push(`<ul class="ai-ul">${items.join('')}</ul>`);
            continue;
        }

        // Numbered list: lines starting with 1. 2. etc.
        if (/^\d+\.\s+/.test(line)) {
            const items = [];
            while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
                items.push(`<li>${inlineFormat(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>`);
                i++;
            }
            outputParts.push(`<ol class="ai-ol">${items.join('')}</ol>`);
            continue;
        }

        // Paragraph
        outputParts.push(`<p class="ai-p">${inlineFormat(line)}</p>`);
        i++;
    }

    return outputParts.join('');
}

/**
 * Handles inline markdown: **bold**, *italic*, `code`
 */
function inlineFormat(text) {
    // Escape HTML first
    let out = escapeHtml(text);

    // **bold** (must come before *italic*)
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // *italic* (single asterisk, not already consumed)
    out = out.replace(/\*([^*]+?)\*/g, '<em>$1</em>');

    // `code`
    out = out.replace(/`([^`]+?)`/g, '<code class="ai-code">$1</code>');

    // ~~strikethrough~~
    out = out.replace(/~~(.+?)~~/g, '<del>$1</del>');

    return out;
}
