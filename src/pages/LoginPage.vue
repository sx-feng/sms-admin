<template>
  <div class="login-page">
    <div class="login-box">
      <h2 class="title">汇科后台管理登录</h2>

      <el-form
        :model="form"
        ref="loginForm"
        label-width="80px"
        @keyup.enter="handleLogin"
      >
        <el-form-item label="账号" prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入管理员账号"
            prefix-icon="User"
            clearable
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            placeholder="请输入密码"
            type="password"
            show-password
            prefix-icon="Lock"
            clearable
          />
        </el-form-item>

        <!-- <el-form-item> -->
          <el-button
            type="primary"
            style="width: 50%"
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        <!-- </el-form-item> -->
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { adminLogin } from '@/api/admin.js'
const router = useRouter()
const loading = ref(false)
const loginForm = ref(null)

const form = ref({
  username: '',
  password: ''
})


async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }

  loading.value = true
  // await new Promise(r => setTimeout(r, 800)) // 模拟请求延迟
const res = await adminLogin({
  username:form.value.username,
  password:form.value.password
})

console.log(res)
if(res.code===200){
const token=res.data
  localStorage.setItem('token',token)
  router.push('/dashboard')
  ElMessage.success(res.message)
} else {
      ElMessage.error(res.message || '登录失败，请检查账号密码')
    }

}
</script>

<style scoped>
.login-page {
  height: 100svh;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 20px;
  background: linear-gradient(135deg, #3a7bd5, #3a6073);
}

.login-box {
  width: 350px;
  padding: 30px 25px 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.title {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
  font-weight: 600;
  font-size: 20px;
}
</style>
