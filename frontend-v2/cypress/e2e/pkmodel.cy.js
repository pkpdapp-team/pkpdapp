describe('landing page', () => {
  beforeEach(() => {
    const { username, password } = { username: 'demo', password: '12345'}
    cy.login(username, password)
  })

  it('can create pkmodel', () => {
  });
});
