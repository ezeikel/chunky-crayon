import { db } from '@one-colored-pixel/db';

async function main() {
  const row = await db.comicStrip.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { slug: true, status: true, qcResults: true },
  });
  if (!row) {
    console.log('no strip');
    process.exit(0);
  }
  console.log('slug:', row.slug);
  console.log('status:', row.status);

  const r = row.qcResults as unknown;
  if (!r || typeof r !== 'object') {
    console.log('qcResults shape: not-object', r);
    process.exit(0);
  }
  // Branch on shape
  const obj = r as Record<string, unknown>;
  if ('panels' in obj && 'scriptJury' in obj && 'wholeStripJury' in obj) {
    const panels = obj.panels as Array<{
      panel: number;
      attempts: number;
      qcPassed: boolean;
      juryVerdict: {
        passed: boolean;
        passingCount: number;
        failingCount: number;
        verdicts: Array<{
          judge: string;
          ok: boolean;
          result?: { passed: boolean; issues: string[] };
          error?: string;
          elapsedMs: number;
        }>;
      };
    }>;
    const script = obj.scriptJury as {
      passed: boolean;
      passingCount: number;
      verdicts: Array<{
        judge: string;
        ok: boolean;
        result?: { passed: boolean; issues: string[] };
        error?: string;
      }>;
    };
    const whole = obj.wholeStripJury as
      | {
          passed: boolean;
          passingCount: number;
          verdicts: Array<{
            judge: string;
            ok: boolean;
            result?: { passed: boolean; issues: string[] };
            error?: string;
          }>;
        }
      | null
      | undefined;

    console.log('\n=== SCRIPT JURY ===');
    console.log(`passed=${script.passed} ${script.passingCount}/3`);
    for (const v of script.verdicts) {
      const tag = v.ok
        ? `OK passed=${v.result?.passed} issues=${v.result?.issues.length ?? 0}`
        : `ERR ${v.error}`;
      console.log(`  [${v.judge}] ${tag}`);
      if (v.ok && v.result?.issues.length) {
        for (const i of v.result.issues) console.log(`    - ${i}`);
      }
    }

    console.log('\n=== PANEL JURY ===');
    for (const p of panels) {
      console.log(
        `\nPanel ${p.panel} (attempts=${p.attempts} qcPassed=${p.qcPassed} jury=${p.juryVerdict.passingCount}/3)`,
      );
      for (const v of p.juryVerdict.verdicts) {
        const tag = v.ok
          ? `OK passed=${v.result?.passed} issues=${v.result?.issues.length ?? 0} (${v.elapsedMs}ms)`
          : `ERR ${v.error} (${v.elapsedMs}ms)`;
        console.log(`  [${v.judge}] ${tag}`);
        if (v.ok && v.result?.issues.length) {
          for (const i of v.result.issues) console.log(`    - ${i}`);
        }
      }
    }

    if (whole) {
      console.log('\n=== WHOLE-STRIP JURY ===');
      console.log(`passed=${whole.passed} ${whole.passingCount}/3`);
      for (const v of whole.verdicts) {
        const tag = v.ok
          ? `OK passed=${v.result?.passed} issues=${v.result?.issues.length ?? 0}`
          : `ERR ${v.error}`;
        console.log(`  [${v.judge}] ${tag}`);
        if (v.ok && v.result?.issues.length) {
          for (const i of v.result.issues) console.log(`    - ${i}`);
        }
      }
    } else {
      console.log('\n=== WHOLE-STRIP JURY === (skipped — panel jury failed)');
    }
  } else {
    console.log('legacy single-judge shape:');
    console.log(JSON.stringify(r, null, 2).slice(0, 1500));
  }

  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
