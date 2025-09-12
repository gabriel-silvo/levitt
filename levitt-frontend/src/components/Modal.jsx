// src/components/Modal.jsx
import React from 'react';
import ReactDOM from 'react-dom';

function Modal({ isOpen, onClose, onConfirm, title, children, confirmText = "Confirmar", secondaryText = "Cancelar", confirmClass = "", showConfirmButton = true, showFooter = true }) {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {/* O rodapé agora é condicional */}
        {showFooter && (
          <div className="modal-footer">
            <button onClick={onClose} className="btn btn--secondary">
              {secondaryText}
            </button>
            {showConfirmButton && (
              <button onClick={onConfirm} className={`btn ${confirmClass || 'btn--primary'}`}>
                {confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default Modal;