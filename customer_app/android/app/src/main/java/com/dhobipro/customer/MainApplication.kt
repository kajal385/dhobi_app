package com.dhobipro.customer

import android.app.Application
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    loadReactNative(this)
  }

  /**
   * Create Android 8.0+ (Oreo) Notification Channels with IMPORTANCE_HIGH
   * and custom crisp notification chime for WhatsApp-style visible heads-up popup banners on screen.
   */
  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

      // Resolve custom sound (soundreality_notification_message_622573 / notification_sound), fallback to system default
      var soundResId = resources.getIdentifier("soundreality_notification_message_622573", "raw", packageName)
      if (soundResId == 0) {
        soundResId = resources.getIdentifier("notification_sound", "raw", packageName)
      }
      val soundUri: Uri = if (soundResId != 0) {
        Uri.parse("android.resource://$packageName/$soundResId")
      } else {
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
      }

      val audioAttributes = AudioAttributes.Builder()
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .build()

      // Primary Customer Channel (IMPORTANCE_HIGH enables heads-up popup banner)
      val customerChannel = NotificationChannel(
        "dhobipro_customer_channel",
        "DhobiPro Order Updates",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Live order status, washing progress, pickup and delivery popup alerts"
        enableLights(true)
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 250, 250, 250)
        setSound(soundUri, audioAttributes)
        setShowBadge(true)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }

      // Fallback Orders Channel
      val ordersChannel = NotificationChannel(
        "dhobipro_orders_channel",
        "DhobiPro Orders",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "General laundry order updates and alerts"
        enableLights(true)
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 250, 250, 250)
        setSound(soundUri, audioAttributes)
        setShowBadge(true)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }

      notificationManager.createNotificationChannel(customerChannel)
      notificationManager.createNotificationChannel(ordersChannel)
    }
  }
}

