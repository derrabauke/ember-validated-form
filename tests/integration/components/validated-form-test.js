import EmberObject from "@ember/object";
import { run } from "@ember/runloop";
import { render, click, blur, focus } from "@ember/test-helpers";
import UserValidations from "dummy/validations/user";
import { setupRenderingTest } from "ember-qunit";
import hbs from "htmlbars-inline-precompile";
import { module, test } from "qunit";
import { defer } from "rsvp";

module("Integration | Component | validated form", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders simple inputs", async function (assert) {
    await render(hbs`
      <ValidatedForm as |f|>
        <f.input @label="First name" />
      </ValidatedForm>
    `);

    assert.dom("form label").hasText("First name");
    assert.dom("form input").hasAttribute("type", "text");
  });

  test("it renders textareas", async function (assert) {
    await render(hbs`
      <ValidatedForm as |f|>
        <f.input @type="textarea" @label="my label" />
      </ValidatedForm>
    `);

    assert.dom("form label").hasText("my label");
    assert.dom("form textarea").exists({ count: 1 });
  });

  test("it renders a radio group", async function (assert) {
    this.set("buttonGroupData", {
      options: [
        { key: "1", label: "Option 1" },
        { key: "2", label: "Option 2" },
        { key: "3", label: "Option 3" },
      ],
    });

    await render(hbs`
      <ValidatedForm as |f|>
        <f.input @type='radioGroup' @label='Options' @name='testOptions' @options={{this.buttonGroupData.options}} />
      </ValidatedForm>
    `);

    assert.dom('input[type="radio"]').exists({ count: 3 });
    assert.dom("label:nth-of-type(1)").hasText("Options");
    assert.dom("div:nth-of-type(1) > input + label").hasText("Option 1");
    assert.dom("div:nth-of-type(2) > input + label").hasText("Option 2");
    assert.dom("div:nth-of-type(3) > input + label").hasText("Option 3");
    assert.dom("div > input + label").exists({ count: 3 });
    assert.dom('input[type="radio"][value="1"]').exists();
    assert.dom('input[type="radio"][value="2"]').exists();
    assert.dom('input[type="radio"][value="3"]').exists();
  });

  test("it renders submit buttons", async function (assert) {
    this.set("stub", function () {});

    await render(hbs`
      <ValidatedForm
        @on-submit={{this.stub}}
        as |f|>
        <f.input @label="First name"/>
        <f.submit @label="Save!"/>
      </ValidatedForm>
    `);

    assert.dom("form button").hasAttribute("type", "submit");
    assert.dom("form button").hasText("Save!");
  });

  test("it renders an always-showing hint", async function (assert) {
    await render(hbs`
      <ValidatedForm as |f|>
        <f.input @label="First name" @hint="Not your middle name!" />
      </ValidatedForm>
    `);

    assert.dom("input + div").doesNotExist();
    assert.dom("input + small").exists({ count: 1 });
    assert.dom("input + small").hasText("Not your middle name!");
  });

  test("does not render a <p> tag for buttons if no callbacks were passed", async function (assert) {
    await render(hbs`
      <ValidatedForm as |f|>
        <f.input @label="First name" />
      </ValidatedForm>
    `);

    assert.dom("form > p").doesNotExist();
  });

  test("it supports default button labels", async function (assert) {
    this.set("stub", function () {});

    await render(hbs`
      <ValidatedForm
        @on-submit={{this.stub}}
        as |f|>
        <f.submit />
      </ValidatedForm>
    `);

    assert.dom("form button[type=submit]").hasText("Save");
  });

  test("it performs basic validations on submit", async function (assert) {
    this.set("submit", function () {});
    this.set("UserValidations", UserValidations);

    run(() => {
      this.set(
        "model",
        EmberObject.create({
          firstName: "x",
        })
      );
    });

    await render(hbs`
      <ValidatedForm
        @model={{changeset model UserValidations}}
        @on-submit={{this.submit}}
        as |f|>
        <f.input @label="First name" @name="firstName"/>
        <f.submit/>
      </ValidatedForm>
    `);

    assert.dom("span.invalid-feedback").doesNotExist();

    await click("button");

    assert.dom("input").hasValue("x");
    assert.dom("span.invalid-feedback").exists({ count: 1 });
    assert
      .dom("span.invalid-feedback")
      .hasText("First name must be between 3 and 40 characters");
  });

  test("it calls on-invalid-submit after submit if changeset is invalid", async function (assert) {
    let invalidSubmitCalled;
    this.set("invalidSubmit", function () {
      invalidSubmitCalled = true;
    });
    this.set("UserValidations", UserValidations);

    run(() => {
      this.set(
        "model",
        EmberObject.create({
          firstName: "x",
        })
      );
    });

    await render(hbs`
      <ValidatedForm
        @model={{changeset this.model this.UserValidations}}
        @on-invalid-submit={{this.invalidSubmit}}
        as |f|
      >
        <f.input label="First name" name="firstName"/>
        <f.submit/>
      </ValidatedForm>
    `);

    await click("button");

    assert.true(invalidSubmitCalled);
  });

  test("it does not call on-invalid-submit after submit if changeset is valid", async function (assert) {
    let invalidSubmitCalled, submitCalled;
    this.set("submit", function () {
      submitCalled = true;
    });
    this.set("invalidSubmit", function () {
      invalidSubmitCalled = true;
    });

    run(() => {
      this.set("model", EmberObject.create({}));
    });

    await render(hbs`
      <ValidatedForm
        @model={{this.model}}
        @on-submit={{this.submit}}
        @on-invalid-submit={{this.invalidSubmit}}
        as |f|>
        <f.input @label="First name" @name="firstName"/>
        <f.submit/>
      </ValidatedForm>
    `);

    await click("button");

    assert.notOk(invalidSubmitCalled);
    assert.true(submitCalled);
  });

  test("it performs validation and calls onClick function on custom buttons", async function (assert) {
    assert.expect(3);

    this.set("onClick", function (model) {
      assert.step("onClick");
      assert.strictEqual(model.firstName, "xenia");
    });
    this.set("onInvalidClick", function () {
      assert.step("onInvalidClick");
    });

    run(() => {
      this.set(
        "model",
        EmberObject.create({
          firstName: "xenia",
        })
      );
    });

    await render(hbs`
      <ValidatedForm
        @model={{this.model}}
        as |f|
      >
        <f.input @label="First name" @name="firstName"/>
        <f.button @on-click={{this.onClick}} @on-invalid-click={{this.onInvalidClick}}/>
      </ValidatedForm>
    `);

    await click("button");

    assert.verifySteps(["onClick"]);
  });

  test("it performs validation and calls onInvalidClick function on custom buttons", async function (assert) {
    assert.expect(3);

    this.set("onClick", function () {
      assert.step("onClick");
    });
    this.set("onInvalidClick", function (model) {
      assert.step("onInvalidClick");
      assert.strictEqual(model.firstName, "x");
    });
    this.set("UserValidations", UserValidations);

    run(() => {
      this.set(
        "model",
        EmberObject.create({
          firstName: "x",
        })
      );
    });

    await render(hbs`
      <ValidatedForm
        @model={{changeset this.model this.UserValidations}}
        as |f|
      >
        <f.input @label="First name" @name="firstName"/>
        <f.button @on-click={{this.onClick}} @on-invalid-click={{this.onInvalidClick}}/>
      </ValidatedForm>
    `);

    await click("button");

    assert.verifySteps(["onInvalidClick"]);
  });

  test("it performs basic validations on focus out", async function (assert) {
    this.set("submit", function () {});
    this.set("UserValidations", UserValidations);

    run(() => {
      this.set("model", EmberObject.create({}));
    });

    await render(hbs`
      <ValidatedForm
        @model={{changeset this.model this.UserValidations}}
        @on-submit=this.submit
        as |f|
      >
        <f.input @label="First name" @name="firstName"/>
        <f.submit />
      </ValidatedForm>
    `);

    assert.dom("input + div").doesNotExist();

    await focus("input");
    await blur("input");

    assert.dom("span.invalid-feedback").exists({ count: 1 });
    assert.dom("span.invalid-feedback").hasText("First name can't be blank");
  });

  test("it skips basic validations on focus out with validateBeforeSubmit=false set on the form", async function (assert) {
    this.set("submit", function () {});
    this.set("UserValidations", UserValidations);

    run(() => {
      this.set("model", EmberObject.create({}));
    });

    await render(hbs`
      <ValidatedForm
        @model={{changeset this.model this.UserValidations}}
        @on-submit={{this.submit}}
        @validateBeforeSubmit={{false}}
        as |f|>
        <f.input @label="First name" @name="firstName" />
        <f.submit/>
      </ValidatedForm>
    `);

    assert.dom("span.invalid-feedback").doesNotExist();

    await focus("input");
    await blur("input");

    assert.dom("span.invalid-feedback").doesNotExist();

    await click("button");

    assert.dom("span.invalid-feedback").exists({ count: 1 });
  });

  test("it skips basic validations on focus out with validateBeforeSubmit=false set on the input", async function (assert) {
    this.set("submit", function () {});
    this.set("UserValidations", UserValidations);

    run(() => {
      this.set("model", EmberObject.create({}));
    });

    await render(hbs`
      <ValidatedForm
        @model={{changeset this.model this.UserValidations}}
        @on-submit={{this.submit}}
        as |f|>
        <f.input @label="First name" @name="firstName" @validateBeforeSubmit={{false}} />
      </ValidatedForm>
    `);

    assert.dom("input + div").doesNotExist();

    await focus("input");
    await blur("input");

    assert.dom("input + div").doesNotExist();
  });

  test("on-submit can be an action returning a promise", async function (assert) {
    const deferred = defer();

    this.set("submit", () => deferred.promise);

    run(() => {
      this.set("model", EmberObject.create({}));
    });

    await render(hbs`
      <ValidatedForm
        @model={{changeset this.model}}
        @on-submit={{this.submit}}
        as |f|>
        <f.submit class={{if f.loading 'loading'}}/>
      </ValidatedForm>
    `);

    assert.dom("button").doesNotHaveClass("loading");

    await click("button");

    assert.dom("button").hasClass("loading");

    run(() => deferred.resolve());

    assert.dom("button").doesNotHaveClass("loading");
  });

  test("on-submit can be an action returning a non-promise", async function (assert) {
    this.set("submit", () => undefined);

    run(() => {
      this.set("model", EmberObject.create({}));
    });

    await render(hbs`
      <ValidatedForm
        @model={{changeset this.model}}
        @on-submit={{this.submit}}
        as |f|>
        <f.submit/>
      </ValidatedForm>
    `);

    assert.dom("button").doesNotHaveClass("loading");

    await click("button");

    assert.dom("button").doesNotHaveClass("loading");
  });

  test("it yields the loading state", async function (assert) {
    const deferred = defer();

    this.set("submit", () => deferred.promise);

    run(() => {
      this.set("model", EmberObject.create({}));
    });

    await render(hbs`
      <ValidatedForm
        @model={{changeset this.model}}
        @on-submit={{this.submit}}
        as |f|>
        {{#if f.loading}}
          <span class="loading">loading...</span>
        {{/if}}
        <f.submit/>
      </ValidatedForm>
    `);
    assert.dom("span.loading").doesNotExist();

    await click("button");

    assert.dom("span.loading").exists();

    run(() => deferred.resolve());

    assert.dom("span.loading").doesNotExist();
  });

  test("it handles being removed from the DOM during sync submit", async function (assert) {
    this.set("show", true);

    this.set("submit", () => {
      this.set("show", false);
    });

    run(() => {
      this.set("model", EmberObject.create({}));
    });

    await render(hbs`
      {{#if show}}
        <ValidatedForm
          @model={{changeset this.model}}
          @on-submit={{this.submit}}
          as |f|>
          {{#if f.loading}}
            <span class="loading">loading...</span>
          {{/if}}
          <f.submit/>
        </ValidatedForm>
      {{/if}}
    `);

    await click("button");
    assert.ok(true);
  });

  test("it handles being removed from the DOM during async submit", async function (assert) {
    this.set("show", true);
    const deferred = defer();

    this.set("submit", () => {
      return deferred.promise.then(() => {
        this.set("show", false);
      });
    });

    run(() => {
      this.set("model", EmberObject.create({}));
    });

    await render(hbs`
      {{#if show}}
        <ValidatedForm
          @model={{changeset this.model}}
          @on-submit={{this.submit}}
          as |f|>
          {{#if f.loading}}
            <span class="loading">loading...</span>
          {{/if}}
          <f.submit/>
        </ValidatedForm>
      {{/if}}
    `);

    await click("button");
    run(() => deferred.resolve());
    assert.ok(true);
  });

  test("it binds the autocomplete attribute", async function (assert) {
    await render(hbs`
      <ValidatedForm @autocomplete="off">
      </ValidatedForm>
    `);

    assert.dom("form").hasAttribute("autocomplete", "off");
  });
});
