import { task } from "hardhat/config";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";

task(TASK_COMPILE).setAction(async function (args, hre, runSuper) {
  await runSuper();

  if (hre.config.contractSize.runOnCompile) {
    await hre.run("contract-size");
  }
});
