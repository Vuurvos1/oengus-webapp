<template>
  <tr>
    <td :id="internalId" :is-expanded="isExpanded" class="expandable">
      A
    </td>

    <td :id="'run-' + run.id" class="time">
      <ElementTemporalDateTime :datetime="run.date" format="shortTime" />
    </td>

    <td v-if="run.setupBlock" class="setup-text" column-end="span 2">
      <div>
        {{ run.setupBlockText || $t("marathon.schedule.setupBlock") }}
      </div>
    </td>
    <td v-else class="runners">
      <div>
        <User
          v-for="runner in run.runners"
          :key="`runner-${runner.id}`"
          :user="runner"
        />
      </div>
    </td>

    <td class="game">
      <div>
        {{ run.gameName }}
      </div>
    </td>

    <td class="category">
      {{ run.categoryName }}
    </td>

    <td class="type">
      {{ $t(`marathon.schedule.type.${run.type}`) }}
    </td>

    <td class="console">
      <ElementConsole :console="run.console" :is-emulated="run.emulated" />
    </td>

    <td class="estimate">
      <ElementTemporalDuration :duration="run.estimate" />
    </td>

    <td class="setup">
      <ElementTemporalDuration :duration="run.setupTime" />
    </td>
  </tr>
</template>

<script lang="ts">
import Vue from 'vue';
import { ScheduleLine } from '~/types/api/schedule';

export default Vue.extend({
  props: {
    run: {
      type: Object as () => ScheduleLine,
      default: undefined,
    },
    internalId: {
      type: String,
      default: undefined,
    },
    isExpanded: {
      type: Boolean,
      default: false,
    },
  },
});
</script>

<style lang="scss" scoped>
@forward "~assets/table/variables";

@use "~assets/table";

td {
  @include table.cell-like();
  @include table.cell-varients();

  // &.runners,
  // &.game > div {
  //   // overflow: auto;
  //   // position: absolute;
  // }
}

.expandable {
  width: 1px;
}
</style>
