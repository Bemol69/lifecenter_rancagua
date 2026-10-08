// Íconos de línea (24x24) para los servicios. La clave es lo que se elige en /admin.
export const ICONOS = {
  jeringa: { nombre: 'Jeringa', d: '<path d="M18 2l4 4M17 7l3-3M3 21l5-5M8 16l9-9 3 3-9 9zM11 13l2 2"/>' },
  gato: { nombre: 'Gato', d: '<path d="M5 9V3l4 3h6l4-3v6c1 1 2 2.5 2 4.5C21 18 17 21 12 21S3 18 3 13.500C3 11.5 4 10 5 9z"/><path d="M9 13h.01M15 13h.01M11 16.500c.6.5 1.4.5 2 0"/>' },
  perro: { nombre: 'Perro', d: '<path d="M4 8c0-3 2-4 3-4l2 3h6l2-3c1 0 3 1 3 4l-1 5c0 4-3 7-7 7s-7-3-7-7z"/><path d="M9 12h.01M15 12h.01M12 15v1.5"/>' },
  chip: { nombre: 'Microchip', d: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4M10 10h4v4h-4z"/>' },
  corazon: { nombre: 'Corazón', d: '<path d="M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.800A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11z"/>' },
  tijera: { nombre: 'Tijeras', d: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.100L20 20M8.1 15.900L20 4"/>' },
  bisturi: { nombre: 'Bisturí', d: '<path d="M3 21l9-9M12 12l6-9 3 3-9 6zM14 10l3 3"/>' },
  ecografia: { nombre: 'Ecografía', d: '<path d="M4 4h16v13H4zM8 21h8M12 17v4"/><path d="M7 11h2l1.5-3 2 6 1.5-3h3"/>' },
  probeta: { nombre: 'Tubo de ensayo', d: '<path d="M9 3h6M10 3v7l-5 9a2 2 0 0 0 1.8 3h10.400A2 2 0 0 0 19 19l-5-9V3"/><path d="M8 15h8"/>' },
  estetoscopio: { nombre: 'Estetoscopio', d: '<path d="M6 3v6a4 4 0 0 0 8 0V3M4 3h4M12 3h4M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>' },
  cruz: { nombre: 'Cruz de urgencia', d: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>' },
  huella: { nombre: 'Huella', d: '<circle cx="5.5" cy="11" r="2"/><circle cx="9.5" cy="6" r="2"/><circle cx="14.5" cy="6" r="2"/><circle cx="18.5" cy="11" r="2"/><path d="M12 12c-3 0-5 3-5 5.5 0 2 1.5 2.5 3 2 1.2-.4 1.8-.5 2-.5s.8.1 2 .5c1.5.5 3-.0 3-2C17 15 15 12 12 12z"/>' },
};
export const iconoSvg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${(ICONOS[k] || ICONOS.huella).d}</svg>`;
