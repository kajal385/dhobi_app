package com.partner_delivery_app

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

      // Partner Alerts Channel (IMPORTANCE_HIGH enables heads-up popup banner)
      val partnerChannel = NotificationChannel(
        "dhobipro_partner_channel",
        "DhobiPro Partner Alerts",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Instant alerts and screen popups for incoming orders, customer confirmations, and delivery tasks"
        enableLights(true)
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 300, 200, 300)
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
        description = "Order status updates and notifications"
        enableLights(true)
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 300, 200, 300)
        setSound(soundUri, audioAttributes)
        setShowBadge(true)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }

      notificationManager.createNotificationChannel(partnerChannel)
      notificationManager.createNotificationChannel(ordersChannel)
    }
  }
}

