export const customersPageSectionsCopy = {
  pageTitle: "Customer",
  export: "Export",
  newCustomer: "New Customer",
  toggleCustomerMetrics: "Toggle customer metrics",
  exportCustomersAriaLabel: "Export customers",
  openSortMenuAriaLabel: "Open customer sort menu",
  tableOptionsTriggerLabel: "Table options",
  clearSelectionAriaLabel: "Clear selection",
  markHealthy: "Mark healthy",
  moveToWatch: "Move to watch",
  archive: "Archive",
  exportCsv: "Export CSV",
  selectAllVisible: (count: number) => `Select all ${count}`,
}

export function formatSelectedCustomersLabel(count: number) {
  return count === 1 ? "1 customer selected" : `${count} customers selected`
}
