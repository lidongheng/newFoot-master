<template>
  <router-view />
</template>

<style lang="less">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
}

// 自定义滚动条
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background-color: #c0c4cc;
  border-radius: 3px;
  
  &:hover {
    background-color: #909399;
  }
}

::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>
