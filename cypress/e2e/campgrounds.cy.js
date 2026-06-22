describe('Campgrounds Page', () => {
  it('loads and displays real seed campgrounds', () => {
    cy.visit('/campgrounds')
    cy.contains('Browse Campgrounds')
    cy.contains('Availability not connected')
    cy.contains('Eagle Point Campground')
  })

  it('filters campgrounds by search', () => {
    cy.visit('/campgrounds')
    cy.get('input[type="search"]').type('Yosemite')
    cy.contains('Upper Pines Campground')
  })

  it('navigates to detail page with source links', () => {
    cy.visit('/campgrounds')
    cy.contains('View details →').first().click()
    cy.url().should('match', /\/campgrounds\//)
    cy.contains('Availability not connected')
    cy.contains('View official info')
    cy.contains('Reservation portal')
  })

  it('navigates to Settings and back', () => {
    cy.visit('/campgrounds')
    cy.contains('Settings').click()
    cy.url().should('include', '/settings')
    cy.contains('Settings')
    cy.contains('Browse Campgrounds').click()
    cy.url().should('include', '/campgrounds')
  })
})
