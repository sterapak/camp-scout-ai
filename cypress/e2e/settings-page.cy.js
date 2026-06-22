describe('Settings Page', () => {
  it('loads settings from campgrounds nav', () => {
    cy.visit('/campgrounds')
    cy.contains('Settings').click()
    cy.url().should('include', '/settings')
    cy.contains('Camp Scout AI preferences')
  })
})
