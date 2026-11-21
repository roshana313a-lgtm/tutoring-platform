// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import BaseBanner from '../../src/features/auth/components/BaseBanner.vue'

describe('BaseBanner', () => {
  it('renders the success variant with a checkmark icon', () => {
    const wrapper = mount(BaseBanner, {
      props: {
        variant: 'success',
        message: 'ثبت نام با موفقیت انجام شد. در حال انتقال به صفحه ورود...',
      },
    })

    expect(wrapper.classes()).toContain('base-banner')
    expect(wrapper.classes()).toContain('banner-success')
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.text()).toContain('ثبت نام با موفقیت انجام شد. در حال انتقال به صفحه ورود...')
    expect(wrapper.find('[data-test="icon-success"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="icon-error"]').exists()).toBe(false)
  })

  it('renders the error variant with an alert icon', () => {
    const wrapper = mount(BaseBanner, {
      props: {
        variant: 'error',
        message: 'ایمیل یا رمز عبور اشتباه است.',
      },
    })

    expect(wrapper.classes()).toContain('base-banner')
    expect(wrapper.classes()).toContain('banner-error')
    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.text()).toContain('ایمیل یا رمز عبور اشتباه است.')
    expect(wrapper.find('[data-test="icon-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="icon-success"]').exists()).toBe(false)
  })

  it('emits dismiss when the close button is clicked', async () => {
    const wrapper = mount(BaseBanner, {
      props: {
        variant: 'error',
        message: 'خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.',
        dismissible: true,
      },
    })

    const closeButton = wrapper.get('[data-test="dismiss"]')
    expect(closeButton.attributes('aria-label')).toBe('بستن پیام خطا')

    await closeButton.trigger('click')

    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })

  it('hides the close button by default', () => {
    const wrapper = mount(BaseBanner, {
      props: {
        variant: 'success',
        message: 'ورود موفق. در حال انتقال...',
      },
    })

    expect(wrapper.find('[data-test="dismiss"]').exists()).toBe(false)
  })
})
