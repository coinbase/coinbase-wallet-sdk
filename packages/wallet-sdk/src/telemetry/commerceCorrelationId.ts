let commerceCorrelationId: string | null = null;

export function setCommerceCorrelationId(id: string) {
  commerceCorrelationId = id;
}

export function getCommerceCorrelationId() {
  return commerceCorrelationId;
}
