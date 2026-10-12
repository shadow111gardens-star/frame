import {designMdFixture} from './designMdFixture';
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { designRoute } from "../server/gemini";
import { fixture } from "./fixture";
import { planFixture } from "./planFixture";
import {targetedRepair} from '../server/designRepair';
import {DesignValidationError} from '../server/designDiagnostics';
import {isNavigationAction} from '../shared/navigation';
import {
  completePlannedSystem,
  validatePlannedDesign,
  resolvedPlanNavigation,
} from "../server/designPlanning";

test("omitted optional token declarations are restored from the plan without overwriting conflicting output", () => {
  const app = fixture(),
    plan = planFixture(structuredClone(app));
  plan.designSystem.colors.primary = "#112233";
  plan.designSystem.textStyles = {
    body: { font: "Inter", fontSize: 16, fontWeight: 400, lineHeight: 1.4 },
  };
  assert.deepEqual(completePlannedSystem(app, plan), [
    "designSystem.colors.primary",
    "designSystem.textStyles.body",
  ]);
  validatePlannedDesign(app, plan);
  app.designSystem.colors.primary = "#ffffff";
  assert.deepEqual(completePlannedSystem(app, plan), []);
  assert.throws(
    () => validatePlannedDesign(app, plan),
    (error: any) => error.details.reason === "DESIGN_SYSTEM",
  );
});

test("missing planned navigation produces repairable edge indexes and still requires actual component destinations", () => {
  const app = fixture(),
    plan = planFixture(structuredClone(app));
  plan.journey = {
    mode: "interactive",
    entryScreens: [app.screens[0].name],
    edges: [
      {
        from: app.screens[0].name,
        to: app.screens[1].name,
        action: "Open next screen",
      },
    ],
    rationale: "Navigate through the screens",
  };
  app.screens[0].components.forEach((c) => {
    delete c.targetScreenId;
  });
  assert.throws(
    () => validatePlannedDesign(app, plan),
    (error: any) =>
      error.details.reason === "PLANNED_NAVIGATION" &&
      error.details.missingEdgeIndexes[0] === 0,
  );
  app.screens[0].components[0].targetScreenId = app.screens[1].id;
  validatePlannedDesign(app, plan);
});

test("semantic system comparison ignores object order but keeps values, array order and quality checks strict", () => {
  const app = fixture(),
    plan = planFixture(app);
  plan.designSystem = structuredClone(app.designSystem);
  plan.designSystem.colors = Object.fromEntries(
    Object.entries(plan.designSystem.colors).reverse(),
  ) as typeof plan.designSystem.colors;
  validatePlannedDesign(app, plan);
  plan.designSystem.spacing.reverse();
  assert.throws(
    () => validatePlannedDesign(app, plan),
    /Design system changed/,
  );
});
test('equivalent hex tokens compare semantically while alpha, text styles and ordered scales remain strict',()=>{
  const app=fixture(),plan=planFixture(structuredClone(app));
  app.designSystem.colors.text='#FFF';app.designSystem.colors.card='#1a1a1f';
  validatePlannedDesign(app,plan);
  app.designSystem.colors.text='#ffffff80';
  assert.throws(()=>validatePlannedDesign(app,plan),(e:any)=>e.details.changedFields.includes('designSystem.colors.text'));
  app.designSystem.colors.text='#fff';
  app.designSystem.textStyles={body:{font:'Inter',fontSize:16,fontWeight:400,lineHeight:1.5}};
  plan.designSystem.textStyles=structuredClone(app.designSystem.textStyles);
  app.designSystem.textStyles.body!.fontSize=17;
  assert.throws(()=>validatePlannedDesign(app,plan),/Design system changed/);
});
test('planned journeys require real screen IDs on visible supported actions, including visible ancestors',()=>{
  const app=fixture(),plan=planFixture(structuredClone(app));
  plan.journey={mode:'interactive',entryScreens:['Home'],edges:[{from:'Home',to:'Profile',action:'Open profile'}],rationale:'Requested journey'};
  const button=app.screens[0].components[2];
  button.targetScreenId='Profile';assert.throws(()=>validatePlannedDesign(app,plan),/navigation edge/);
  button.targetScreenId='profile';validatePlannedDesign(app,plan);
  assert.deepEqual(resolvedPlanNavigation(app,plan)[0].actionComponentIds,['button']);
  for(const type of ['Divider','Progress','Chart','Input','Search'] as const){button.type=type;assert.throws(()=>validatePlannedDesign(app,plan),/navigation edge/);}
  button.type='Button';button.styles.opacity=0;assert.throws(()=>validatePlannedDesign(app,plan),/navigation edge/);
  button.styles.opacity=1;button.styles.responsive={maxWidth:400,hidden:true};assert.throws(()=>validatePlannedDesign(app,plan),/navigation edge/);
  delete button.styles.responsive;
  app.screens[0].components[0].children!.push(button.id);app.screens[0].components[0].styles.opacity=0;
  assert.equal(isNavigationAction(app.screens[0],button.id),false);
  app.screens.pop();assert.deepEqual(resolvedPlanNavigation(app,plan)[0].actionComponentIds,[]);
});
test('targeted token/navigation/bounds repair preserves every valid unrelated screen and project identity',()=>{
  const app=fixture(),plan=planFixture(structuredClone(app));
  plan.journey={mode:'interactive',entryScreens:['Home'],edges:[{from:'Home',to:'Profile',action:'Open profile'}],rationale:'Journey'};
  const original={message:'Draft',app};
  const error=new DesignValidationError('Missing edge','DESIGN_CONSISTENCY',{reason:'PLANNED_NAVIGATION',missingEdgeIndexes:[0]});
  const repair=targetedRepair(original,error,plan)!;
  assert.deepEqual(repair.scope.screenIds,['home']);
  const fixed=structuredClone(original);fixed.app.name='Unrelated rename';fixed.app.designSystem.colors.accent='#ff0000';fixed.app.screens[1].components[0].text='Unrelated rewrite';fixed.app.screens[0].components[2].targetScreenId='profile';
  const restored=repair.restore(fixed) as typeof original;
  assert.equal(restored.app.name,app.name);assert.deepEqual(restored.app.screens[1],app.screens[1]);assert.deepEqual(restored.app.designSystem,app.designSystem);validatePlannedDesign(restored.app,plan);
  const tokenRepair=targetedRepair(original,new DesignValidationError('Tokens','DESIGN_CONSISTENCY',{reason:'DESIGN_SYSTEM'}),plan)!;
  assert.deepEqual((tokenRepair.restore(fixed) as typeof original).app.screens,app.screens);
  const boundsRepair=targetedRepair(original,new DesignValidationError('Bounds','DESIGN_CONSISTENCY',{reason:'BOUNDS',screenIndex:0,componentIndex:2}),plan)!;
  assert.deepEqual(boundsRepair.scope.componentIds,['button']);assert.deepEqual((boundsRepair.restore(fixed) as typeof original).app.screens[1],app.screens[1]);
  app.screens[0].components[2].targetScreenId='Profile';
  const invalidId=targetedRepair(original,new DesignValidationError('Unknown ID','DESIGN_RELATIONSHIPS',{reason:'MISSING_NAVIGATION_TARGET'}),plan)!;
  assert.deepEqual(invalidId.scope,{screenIds:['home'],componentIds:['button'],designSystem:false});
});
test("route diagnoses and bounds repair of real design/schema/plan failures without leaking input", async () => {
  const originalFetch = globalThis.fetch,
    originalLog = console.info;
  const logs: unknown[][] = [];
  console.info = (...args) => {
    logs.push(args);
  };
  let scenario = "review-system",
    repairs = 0,
    designCalls = 0;
  globalThis.fetch = (async (input, init) => {
    if (!String(input).startsWith("https://generativelanguage.googleapis.com"))
      return originalFetch(input, init);
    assert.equal(String(input), 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent');
    const request = JSON.parse(String(init?.body));
    const payload = JSON.parse(request.contents[0].parts[0].text);
    const props = request.generationConfig.responseJsonSchema.properties;
    let output: unknown;
    if (props.visualTokens) output = planFixture(fixture());
    else if(props.designMd)output=designMdFixture(payload.designPlan,payload.originalPrompt);
    else if (!props.app)
      output = {
        productType: "mobile_app",
        category: "fitness",
        audience: "Adults",
        styleHints: [],
        theme: "unspecified",
        preferences: { style: [], colors: [], typography: [], branding: [] },
        goals: [],
        screens: [],
        sections: [],
        uxNeeds: [],
      };
    else {
      designCalls++;
      const app = fixture();
      const isRepair = payload.mode === "validation-repair",
        isReview = payload.mode === "review";
      if (isRepair) repairs++;
      if(payload.mode==='generate'||isReview||isRepair){
        assert.deepEqual(payload.designPlan.designSystem,fixture().designSystem);
        assert.deepEqual(payload.designPlan.screens.map((s:any)=>s.name),['Home','Profile']);
        assert.ok(payload.designPlan.journey);
      }
      if(isReview)assert.ok(Array.isArray(payload.resolvedNavigation));
      if(isRepair&&payload.repairScope?.screenIds.length===1&&!payload.repairScope.screenIds.includes('profile')){app.screens[1].components[0].text='Must not rewrite valid screen';}
      if (
        scenario === "irreparable" ||
        (isReview && scenario === "review-system") ||
        (isReview && scenario === "draft-and-review")
      )
        app.designSystem.colors.accent = "#ff0000";
      if (isReview && scenario === "review-screens") app.screens.pop();
      if (isReview && scenario === "review-bounds")
        app.screens[0].components[2].position.y = 900;
      if (isReview && scenario === "review-type") {
        app.productType = "website";
        app.screens.forEach((s) => (s.width = 1440));
      }
      output = { message: "Created editable screens", app };
      if (
        !isReview &&
        !isRepair &&
        (scenario === "malformed" || scenario === "draft-and-review")
      )
        return new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "STOP",
                content: { parts: [{ text: '{"app":' }] },
              },
            ],
          }),
        );
    }
    return new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: JSON.stringify(output) }] },
          },
        ],
      }),
    );
  }) as typeof fetch;
  let server: Server | undefined;
  try {
    const route = designRoute({
      GEMINI_API_KEY: "private-api-key",
      GEMINI_MODEL: "gemini-3.1-flash-lite",
    },async()=> 'test-uid');
    server = createServer((req, res) => void route(req, res, () => res.end()));
    await new Promise<void>((resolve) =>
      server!.listen(0, "127.0.0.1", resolve),
    );
    const url = `http://127.0.0.1:${(server.address() as any).port}/api/design`;
    const original = JSON.stringify(fixture());
    for (const next of [
      "review-system",
      "review-screens",
      "review-bounds",
      "review-type",
      "malformed",
      "irreparable",
      "draft-and-review",
    ]) {
      scenario = next;
      repairs = 0;
      designCalls = 0;
      const response = await originalFetch(url, {
        method: "POST",
        body: JSON.stringify({
          mode: "generate",
          productType: "mobile_app",
          prompt: "Fitness tracking app private-person@example.test",
        }),
      });
      const result = await response.json();
      assert.equal(repairs, next==='draft-and-review'?2:1);
      if (next === "irreparable") {
        assert.equal(response.status, 502);
        assert.equal(result.code, "DESIGN_CONSISTENCY");
        assert.equal(result.reason, "DESIGN_SYSTEM");
        assert.equal(result.app, undefined);
        assert.ok(result.stage);
        assert.ok(result.requestId);
        assert.ok(designCalls <= 3);
      } else {
        assert.equal(response.status, 200);
        assert.deepEqual(result.app, fixture());
        assert.ok(designCalls<=4,'At most draft, draft repair, review and review repair');
      }
    }
    assert.equal(JSON.stringify(fixture()), original);
    const text = JSON.stringify(logs);
    assert.ok(!text.includes("private-api-key"));
    assert.ok(!text.includes("private-person@example.test"));
    assert.ok(text.includes("validation_failed"));
    assert.ok(text.includes("BOUNDS"));
    assert.ok(text.includes("PLANNED_SCREENS"));
    assert.ok(text.includes("changedFields"));
    assert.ok(text.includes("repair_failed"));
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalLog;
    if (server)
      await new Promise<void>((resolve) => server!.close(() => resolve()));
  }
});
