// src/components/Modal.jsx
import React from 'react';
import ReactDOM from 'react-dom';

function Modal({ isOpen, onClose, onConfirm, title, children, confirmText = "Confirmar", confirmClass = "" }) {
  if (!isOpen) return null;

  // Usamos um Portal para renderizar o modal no final do <body>
  // Isso evita problemas de sobreposição e z-index.
  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <div className="modal-body">
          {children}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn--secondary">Cancelar</button>
          <button onClick={onConfirm} className={'btn ' + (confirmClass === 'delete-btn' ? 'btn--danger' : 'btn--primary')}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;