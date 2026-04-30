let io;

const init = (socketIO) => { io = socketIO; };

const emitirNuevoTicket = (ticket) => {
  if (!io) return;
  io.to(`tenant:${ticket.tenant_id}`).emit('ticket:nuevo', ticket);
};

const emitirTicketActualizado = (ticket) => {
  if (!io) return;
  io.to(`tenant:${ticket.tenant_id}`).emit('ticket:actualizado', ticket);
  io.to(`ticket:${ticket.id}`).emit('ticket:cambio', ticket);
};

const emitirNuevoComentario = (ticketId, comentario) => {
  if (!io) return;
  io.to(`ticket:${ticketId}`).emit('comentario:nuevo', comentario);
};

const emitirAlertaSLA = (ticket) => {
  if (!io) return;
  io.to(`tenant:${ticket.tenant_id}`).emit('sla:alerta', {
    ticketId: ticket.id,
    codigo: ticket.codigo,
    mensaje: `SLA por vencer en ticket ${ticket.codigo}`
  });
};

module.exports = { init, emitirNuevoTicket, emitirTicketActualizado, emitirNuevoComentario, emitirAlertaSLA };
