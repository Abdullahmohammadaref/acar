---
name: web-artifacts-builder
description: Build interactive web applications and artifacts with HTML, CSS, and JavaScript. Use this skill when creating standalone web applications, interactive tools, dashboards, or web-based utilities that can run in a browser.
---

# Web Artifacts Builder Skill

This skill guides the creation of interactive, self-contained web applications and artifacts that run directly in a browser.

## What is a Web Artifact?

A web artifact is a complete, self-contained web application that:
- Runs entirely in the browser (no backend required)
- Uses HTML, CSS, and JavaScript
- Can be saved as a single file or a small set of files
- Provides interactive functionality and user interface

## When to Use This Skill

Use this skill when:
- User asks to create an interactive tool or utility
- User wants a web-based calculator, converter, or generator
- User needs a dashboard or data visualization
- User wants to build a game or interactive experience
- User needs a form or data entry application
- User wants a note-taking app or similar utility

## Best Practices

### Structure
- Keep artifacts self-contained when possible
- Use semantic HTML for accessibility
- Organize CSS with clear structure and comments
- Use modular JavaScript with clear function organization

### Interactivity
- Provide immediate visual feedback for user actions
- Use smooth transitions and animations appropriately
- Implement keyboard shortcuts for power users
- Ensure responsive design for different screen sizes

### Performance
- Minimize external dependencies
- Optimize images and assets
- Use efficient JavaScript patterns
- Test performance on various devices

### User Experience
- Clear visual hierarchy and navigation
- Intuitive controls and interactions
- Helpful error messages and guidance
- Accessibility considerations (ARIA labels, keyboard navigation)

## Common Patterns

### State Management
Use JavaScript objects or the browser's localStorage for managing application state:

```javascript
const state = {
  data: [],
  settings: {}
};
```

### Event Handling
Organize event listeners for clean, maintainable code:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initializeApp();
});
```

### DOM Manipulation
Use modern DOM APIs for efficient updates:

```javascript
const element = document.querySelector('.selector');
element.textContent = 'Updated content';
```

## Tips for Great Artifacts

1. **Visual Polish**: Pay attention to spacing, typography, and color harmony
2. **Responsive Design**: Test on mobile, tablet, and desktop
3. **Performance**: Avoid unnecessary re-renders and DOM updates
4. **Accessibility**: Include proper labels, alt text, and keyboard navigation
5. **Documentation**: Add comments explaining complex logic
