<template>
  <section class="form-section odds-fields">
    <div class="form-section-title">让球盘</div>
    <van-field v-model="model.handicap.home.value" label="主队盘口" />
    <van-field label="主队水位"><template #input><van-stepper v-model="model.handicap.home.odds" :min="0.01" :step="0.01" :decimal-length="2" /></template></van-field>
    <van-field v-model="model.handicap.away.value" label="客队盘口" />
    <van-field label="客队水位"><template #input><van-stepper v-model="model.handicap.away.odds" :min="0.01" :step="0.01" :decimal-length="2" /></template></van-field>
    <div class="form-section-title divided-title">大小球</div>
    <van-field v-model="model.overUnder.over.value" label="大球盘口" />
    <van-field label="大球水位"><template #input><van-stepper v-model="model.overUnder.over.odds" :min="0.01" :step="0.01" :decimal-length="2" /></template></van-field>
    <van-field v-model="model.overUnder.under.value" label="小球盘口" />
    <van-field label="小球水位"><template #input><van-stepper v-model="model.overUnder.under.odds" :min="0.01" :step="0.01" :decimal-length="2" /></template></van-field>
    <div class="form-section-title divided-title">独赢盘</div>
    <van-field label="主胜赔率"><template #input><van-stepper v-model="model.moneyline.home.odds" :min="0.01" :step="0.01" :decimal-length="2" /></template></van-field>
    <van-field label="平局赔率"><template #input><van-stepper v-model="model.moneyline.draw.odds" :min="0.01" :step="0.01" :decimal-length="2" /></template></van-field>
    <van-field label="客胜赔率"><template #input><van-stepper v-model="model.moneyline.away.odds" :min="0.01" :step="0.01" :decimal-length="2" /></template></van-field>
  </section>
</template>

<script setup>
const model = defineModel({ type: Object, required: true });
</script>

<style lang="less" scoped>
.odds-fields {
  .divided-title {
    margin-top: 4px;
    border-top: 1px solid #f2f3f5;
  }
}
</style>
