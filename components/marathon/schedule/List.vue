<template>
  <div>
    <WidgetAdvertisement
      class="is-advertisement"
      show-advertisement
      is-horizontal
    />

    <table class="schedule-container">
      <!-- Header -->
      <!-- TODO turn this into its own component? -->
      <thead>
        <tr>
          <th is-header class="expandable element-table-header" />
          <th is-header class="time">
            {{ $t('marathon.schedule.table.time') }}
          </th>
          <th is-header class="runners element-table-header">
            {{ $t('marathon.schedule.table.runner') }}
          </th>
          <th is-header class="game element-table-header">
            {{ $t('marathon.schedule.table.game') }}
          </th>
          <th is-header class="category">
            {{ $t('marathon.schedule.table.category') }}
          </th>
          <th is-header class="type">
            {{ $t('marathon.schedule.table.type') }}
          </th>
          <th is-header class="console">
            {{ $t('marathon.schedule.table.console') }}
          </th>
          <th is-header class="estimate">
            {{ $t('marathon.schedule.table.estimate') }}
          </th>
          <th is-header class="setup">
            {{ $t('marathon.schedule.table.setup') }}
          </th>
        </tr>
      </thead>

      <!-- Main Schedule Loop -->
      <tbody v-if="runs">
        <template v-for="(run, index) in runs">
          <tr
            v-show="shouldShowDay(index) && index !== 0"
            :key="`advertisement-${index}`"
            colspan="20"
          >
            <WidgetAdvertisement
              class="is-advertisement"
              :show-advertisement="advertisementIndices.includes(index)"
              show-spacer
              is-horizontal
            />
          </tr>

          <tr v-show="shouldShowDay(index)" :key="`day-${index}`">
            <td colspan="20 " class="day is-info">
              <ElementTemporalDateTime :datetime="run.date" format="longDate" />
            </td>
          </tr>

          <!-- XXX @click.native will stop working in Vue v3+ (Vue Router v4+), but @click should start working -->
          <MarathonScheduleRow
            :key="`run-${index}`"
            class="run"
            :class="getRowParity(index, run)"
            :run="run"
            :is-expanded="expanded.has(run.id)"
            :internal-id="getId(run)"
            @click.native="toggleExpand(run.id)"
          />

          <ElementTableDetail
            v-if="expanded.has(run.id)"
            :key="`expanded-${index}`"
            class="expanded-run"
            :class="getRowParity(index, run)"
          >
            <MarathonScheduleRun :run="run" />
          </ElementTableDetail>
        </template>
      </tbody>
    </table>
    <div class="is-centered">
      <WidgetLoading :while="[schedule]" />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapActions } from 'vuex';
import { toggleTableExpand } from '~/assets/table';
import {
  Schedule,
  ScheduleLine,
  ScheduleState,
  ScheduleTicker,
} from '~/types/api/schedule';

export default Vue.extend({
  props: {
    marathonId: {
      type: String,
      default: '',
    },
    runHash: {
      type: String,
      default: '',
    },
  },

  data() {
    return {
      expanded: new Set<number>(),
      interval: undefined as NodeJS.Timeout | undefined,
    };
  },

  async fetch(): Promise<void> {
    await Promise.allSettled([
      this.getSchedule(this.marathonId),
      this.getScheduleTicker(this.marathonId),
    ]);
  },

  computed: {
    schedule(): Schedule | undefined {
      return (this.$store.state.api.schedule as ScheduleState).schedules[
        this.marathonId
      ];
    },
    runs(): Array<ScheduleLine> | undefined {
      return this.schedule?.lines;
    },
    tickers(): ScheduleTicker | undefined {
      return (this.$store.state.api.schedule as ScheduleState).tickers[
        this.marathonId
      ];
    },
    advertisementIndices(): Array<number> {
      const advertisementIndices: Array<number> = [];
      const minimumGap = 16;
      let index = minimumGap;
      const runsLength = this.runs?.length ?? 0;
      while (index < runsLength) {
        if (this.shouldShowDay(index)) {
          advertisementIndices.push(index);
          index += minimumGap;
          continue;
        }
        index++;
      }
      return advertisementIndices;
    },
  },

  watch: {
    runHash(): void {
      this.expandRunHash();
    },
  },

  mounted(): void {
    this.interval = setInterval(() => {
      this.getScheduleTicker(this.marathonId);
    }, 60_000);
    this.expandRunHash();
  },

  destroyed(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  },

  methods: {
    toggleExpand(run?: number, openOnly = false): void {
      toggleTableExpand(this.expanded, run, openOnly);
      this.expanded = new Set(this.expanded);
    },
    expandRunHash(): void {
      if (this.runHash) {
        const runHashRegExp = /^#run-(\d+)$/;
        const runHashResults = runHashRegExp.exec(this.runHash);
        if (runHashResults) {
          this.toggleExpand(Number.parseInt(runHashResults[1]), true);
        } else if (this.tickers) {
          if (this.runHash === '#current') {
            this.toggleExpand(this.tickers.current?.id, true);
          } else if (this.runHash === '#next') {
            this.toggleExpand(this.tickers.next?.id, true);
          }
        }
      }
    },
    getId(run: ScheduleLine): string | undefined {
      switch (run.id) {
        case this.tickers?.current?.id:
          return 'current';
        case this.tickers?.next?.id:
          return 'next';
        default:
          return undefined;
      }
    },
    getRowParity(
      index: number,
      run: ScheduleLine,
    ): { 'is-primary': boolean; 'is-even': boolean; 'is-odd': boolean } {
      return {
        'is-even': index % 2 === 0,
        'is-odd': index % 2 === 1,
        'is-primary': run.id === this.tickers?.current?.id,
      };
    },
    shouldShowDay(index: number): boolean {
      // Always show the day header at the top
      if (index === 0) {
        return true;
      }

      // Otherwise, only show when the day transitioned
      const currentRun = new Date(this.runs![index].date);
      // We have an implicit index test for the index=0 case, so this is always safe
      const previousRun = new Date(this.runs![index - 1].date);

      return (
        currentRun.getDate() !== previousRun.getDate() ||
        currentRun.getMonth() !== previousRun.getMonth() ||
        currentRun.getFullYear() !== previousRun.getFullYear()
      );
    },
    ...mapActions({
      getSchedule: 'api/schedule/get',
      getScheduleTicker: 'api/schedule/ticker',
    }),
  },
});
</script>

<style lang="scss" scoped>
@forward "~assets/table/variables";

@use "~assets/table";

th {
  @include table.cell-like();
  @include table.cell-varients();

  padding: calc(var(--spacing) / 2);
  font-weight: bold;
}

.expandable {
  width: 1px;
}

.is-info {
  @include table.cell-like();
  @include table.cell-varients();

  padding: calc(var(--spacing) / 2);
}

.schedule-container {
  $sizes: (
    1150px ".setup",
    1023px ".console",
    900px ".type",
    768px ".estimate",
    600px ".category"
  );

  @each $size, $class in $sizes {
    @media (max-width: $size) {
      ::v-deep #{$class} {
        display: none;
      }
    }
  }

  width: 100%;
  max-width: 100%;
  overflow-x: auto;

  > .run {
    cursor: pointer;
  }

  .day {
    font-weight: bold;
    text-align: center;
  }

  // > .is-advertisement {
  //  justify-self: center;
  // }
}

// This solution is less than ideal.
// I'd prefer to avoid leaking information from parents, this isn't portable
// This allows these rules to work only when in desktop and when the sidebar is expanded
// @media (min-width: 1023px) {
//   .marathon-container:not(.collapsed) .schedule-container {
//     @include table.shrink(
//       $default-template-columns: 9,
//       $has-expand-button: true,
//       $shrinking-rules: (
//         1450px ".setup" 8,
//         1350px ".console" 7,
//         1250px ".type" 6,
//         1100px ".estimate" 5,
//       )
//     );
//   }
// }

@media (max-width: 500px) {
  // Make table work better small screens
  table {
    table-layout: fixed;
  }

  ::v-deep .runners > div,
  ::v-deep .game > div {
    overflow: scroll;
  }

  ::v-deep .expandable {
    width: 1.5rem;
  }

  ::v-deep .time {
    width: 4rem;
  }

  ::v-deep .game,
  ::v-deep .runners {
    width: 100%;
  }
}
</style>
