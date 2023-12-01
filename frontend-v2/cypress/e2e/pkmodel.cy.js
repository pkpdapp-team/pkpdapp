describe("landing page", () => {
  beforeEach(() => {
    const { username, password } = { username: "demo", password: "12345" };
    cy.login(username, password);
  });

  it("can create combined pk and pd model and simulate from it", () => {
    // create a new project
    cy.intercept("POST", "/api/project/").as("createProject");
    cy.get('[data-cy="create-project"]').click();
    cy.get('[data-cy="create-project-option-Small Molecule"]').click();
    cy.wait("@createProject").then((interception) => {
      const { id } = interception.response.body;

      // select the species
      cy.get(`[data-cy="project-${id}"]`)
        .find('[data-cy="select-project.species"]')
        .click();
      cy.get('[data-cy="select-option-project.species-Monkey"]').click();

      // select the project
      cy.get(`[data-cy="project-${id}"]`).find("[type=radio]").click();
    });

    cy.get('[data-cy="select-project.species"]').last().click();
    cy.get('[data-cy="select-option-project.species-Monkey"]').last().click();

    // go to model tab
    cy.get("li").contains("Model").click();

    // select one compartment model
    cy.get('[data-cy="select-pk_model"]').click();
    cy.get(
      '[data-cy="select-option-pk_model-one_compartment_preclinical"]',
    ).click();

    // select pd model
    cy.get('[data-cy="select-pd_model"]').click();
    cy.get(
      '[data-cy="select-option-pd_model-indirect_effects_stimulation_elimination"]',
    ).click();

    // go to map variables tab
    cy.contains("button", "Map Variables").click();

    // dose into Aa compartment
    cy.get('[data-cy="checkbox-dosing-Aa"]').click();

    // map C1 to pd effect
    cy.get('[data-cy="checkbox-map-to-pd-C1"]').click();

    // go to parameters tab
    cy.contains("button", "Parameters").click();

    cy.get('[data-cy="parameter-CL-value"]')
      .find("input")
      .then(($input) => {
        const old_value = $input.val();

        // reset to species defaults
        cy.contains("button", "Reset to Species Defaults").click();
        cy.wait(1000);

        // check that the value has changed
        cy.get('[data-cy="parameter-CL-value"]')
          .find("input")
          .then(($input) => {
            expect($input.val()).not.to.eq(old_value);
          });
      });

    // go to trial design tab
    cy.get("li").contains("Trial Design").click();

    // set the dose
    cy.get('input[name="doses.0.amount"]').clear().type("1");

    // set the number of doses
    cy.get('input[name="doses.0.repeats"]').clear().type("4");

    // set the duration
    cy.get('input[name="doses.0.duration"]').clear().type("0.1");

    // set the interval
    cy.get('input[name="doses.0.repeat_interval"]').clear().type("0.1");

    // go to simulation tab
    cy.get("li").contains("Simulations").click();

    // should be no svg with class "main-svg"
    cy.get("svg.main-svg").should("not.exist");

    // add a plot of Aa
    cy.get('[data-cy="add-plot"]').click();
    cy.get('[data-cy^="add-plot-option-Aa"]').click();

    // now there should be an svg with class "main-svg"
    cy.get("svg.main-svg").should("exist");

    // should be no CL slider
    cy.get('[data-cy="parameter-slider-CL"]').should("not.exist");

    // add a CL parameter slider
    cy.get('[data-cy="add-parameter-slider"]').click();
    cy.get('[data-cy="add-parameter-slider-option-CL"]').click();

    // CL slider should exist
    cy.get('[data-cy="parameter-slider-CL"]').should("exist");
  });
});
