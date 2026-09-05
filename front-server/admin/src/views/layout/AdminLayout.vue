<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="admin-aside">
      <div class="logo">
        <span v-if="!isCollapse">后台</span>
        <span v-else>⚽</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="admin-menu"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        background-color="#1e2128"
        text-color="#a3a6ad"
        active-text-color="#409eff"
      >
        <el-menu-item index="/match">
          <el-icon><Football /></el-icon>
          <template #title>比赛管理</template>
        </el-menu-item>
        <el-menu-item index="/league">
          <el-icon><Trophy /></el-icon>
          <template #title>联赛管理</template>
        </el-menu-item>
        <el-menu-item index="/bet-order">
          <el-icon><Tickets /></el-icon>
          <template #title>投注订单</template>
        </el-menu-item>
        <el-menu-item index="/account">
          <el-icon><Wallet /></el-icon>
          <template #title>账户管理</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container class="admin-main-container">
      <!-- 头部 -->
      <el-header class="admin-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-dropdown">
              <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
              <span class="username">管理员</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人设置</el-dropdown-item>
                <el-dropdown-item divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="admin-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Football,
  Trophy,
  Tickets,
  Wallet,
  Fold,
  Expand,
  ArrowDown
} from '@element-plus/icons-vue'

const route = useRoute()
const isCollapse = ref(false)

const activeMenu = computed(() => route.path)

const currentTitle = computed(() => {
  return route.meta?.title || ''
})
</script>

<style lang="less" scoped>
.admin-layout {
  height: 100vh;
  
  .admin-aside {
    background: #1e2128;
    transition: width 0.3s;
    overflow: hidden;
    
    .logo {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      color: #fff;
      background: #16181d;
      white-space: nowrap;
    }
    
    .admin-menu {
      border-right: none;
      
      :deep(.el-menu-item) {
        &:hover {
          background-color: #262a33 !important;
        }
        
        &.is-active {
          background-color: #409eff !important;
          color: #fff !important;
        }
      }
    }
  }
  
  .admin-main-container {
    flex-direction: column;
    
    .admin-header {
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      padding: 0 20px;
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;
        
        .collapse-btn {
          font-size: 20px;
          cursor: pointer;
          transition: color 0.3s;
          
          &:hover {
            color: #409eff;
          }
        }
      }
      
      .header-right {
        .user-dropdown {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          
          .username {
            color: #606266;
          }
        }
      }
    }
    
    .admin-main {
      background: #f0f2f5;
      padding: 20px;
      overflow-y: auto;
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
