import sanitizeHtml from 'sanitize-html';

export function articleHtml(content: string) {
  return sanitizeHtml(content, {
    allowedTags: ['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'strong', 'em', 'a', 'br', 'hr', 'img', 'figure', 'figcaption'],
    allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height', 'loading'] },
    allowedSchemes: ['http', 'https', 'mailto'], allowedSchemesByTag: { img: ['https'] }, allowProtocolRelative: false,
    transformTags: { img: sanitizeHtml.simpleTransform('img', { loading: 'lazy' }) },
  });
}
