import React, { useEffect, useState } from "react";
import { Colors } from "../../constants/colors";
import { authService } from "../../services/authService";
import { Marquee } from "@animatereactnative/marquee";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import LinearGradient from "react-native-linear-gradient";
import { useDispatch } from "react-redux";
import { authSuccess } from "../../store/authSlice";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Image,
  ImageBackground,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import CountryPicker, { Country, CountryCode } from "react-native-country-picker-modal";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { OtpInput } from "react-native-otp-entry";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import AppScreen from "../../components/AppScreen";

const data1 = [
  require("../../../assets/myimages/cat_wash_fold_icon.png"),
  require("../../../assets/myimages/cat_dry_clean.jpg"),
  require("../../../assets/myimages/cat_steam_iron.jpg"),
  require("../../../assets/myimages/cat_express_laundry.jpg"),
];
const data2 = [
  require("../../../assets/myimages/cat_wash_iron.jpg"),
  require("../../../assets/myimages/cat_shoe_cleaning.jpg"),
  require("../../../assets/myimages/cat_blanket_cleaning.jpg"),
  require("../../../assets/myimages/cat_premium_garments.jpg"),
];
const data3 = [
  require("../../../assets/myimages/cat_carpet_cleaning.jpg"),
  require("../../../assets/myimages/cat_curtain_cleaning.jpg"),
  require("../../../assets/myimages/cat_sofa_cover_cleaning.jpg"),
  require("../../../assets/myimages/cat_commercial_laundry.jpg"),
];

const row1List = [...data1, ...data1, ...data1, ...data1];
const row2List = [...data2, ...data2, ...data2, ...data2];
const row3List = [...data3, ...data3, ...data3, ...data3];

const { width } = Dimensions.get("window");

function normalizePhone(raw: string) {
  return raw.replace(/\D/g, "").slice(-10);
}

function GradientButton({
  label,
  onPress,
  loading,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable style={{ width: "100%", alignSelf: "center" }} onPress={onPress} disabled={loading}>
      <LinearGradient
        colors={[
          Colors.gradient_color_1,
          Colors.gradient_color_2,
          Colors.gradient_color_3,
          Colors.gradient_color_4,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.buttonView}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.8)", "rgba(255,255,255,0.25)", "transparent"]}
          style={styles.whiteSpread}
        />
        {loading ? (
          <ActivityIndicator color={Colors.white_color} />
        ) : (
          <Text style={styles.buttonText}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export default function AnimatedAuthScreen() {
  const dispatch = useDispatch();

  const [countryCode, setCountryCode] = useState<CountryCode>("IN");
  const [callingCode, setCallingCode] = useState("91");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [tempAuthData, setTempAuthData] = useState<any>(null);

  const translateX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const Card = ({ image }: { image: number }) => (
    <View style={styles.card}>
      <Image source={image} style={styles.image} />
    </View>
  );

  const changePage = (next: number) => {
    setPage(next);
    translateX.value = width;
    translateX.value = withTiming(0, { duration: 1000 });
  };

  const onContinue = () => {
    translateX.value = withTiming(-width, { duration: 250 }, (finished) => {
      if (finished) runOnJS(changePage)(1);
    });
  };

  const onBackToPhone = () => {
    translateX.value = -width;
    setPage(0);
    translateX.value = withTiming(0, { duration: 250 });
  };

  const validateMobile = () => {
    if (!mobile.trim()) {
      setError("Please enter mobile number");
      return false;
    }
    if (mobile.length !== 10) {
      setError("Please enter a valid 10 digit mobile number");
      return false;
    }
    return true;
  };

  const validateOtp = () => {
    if (!otp.trim()) {
      setOtpError("Please enter valid otp");
      return false;
    }
    if (otp.length !== 6) {
      setOtpError("Please enter a valid otp");
      return false;
    }
    return true;
  };

  const sendCode = async () => {
    if (!validateMobile()) return;
    setLoading(true);
    setError("");
    try {
      const result = await authService.sendOtp(normalizePhone(mobile), callingCode);
      onContinue();
      if (result?.data?.dev_otp) setOtpError(`Dev OTP: ${result.data.dev_otp}`);
    } catch (e: any) {
      setError(e.message || "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!validateOtp()) return;
    setLoading(true);
    setOtpError("");
    try {
      const result = await authService.verifyOtp(normalizePhone(mobile), otp.trim(), callingCode);
      const isNewUser = result?.data?.is_new_user;
      const user = result?.data?.user;
      const token = result?.data?.access_token;

      const needsName = isNewUser && (!user.name || /^User \d{4}$/.test(user.name));

      if (needsName) {
        setTempAuthData({ user, token });
        translateX.value = withTiming(-width, { duration: 250 }, (finished) => {
          if (finished) runOnJS(changePage)(2);
        });
      } else {
        dispatch(authSuccess({ user, token }));
      }
    } catch (e: any) {
      setOtpError(e.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const completeSignup = async () => {
    if (name.trim().length < 2) {
      setNameError("Please enter your full name");
      return;
    }
    setLoading(true);
    setNameError("");
    try {
      const result = await authService.updateProfile({ name: name.trim() }, tempAuthData.token);
      dispatch(authSuccess({ user: result, token: tempAuthData.token }));
    } catch (e: any) {
      setNameError(e.message || "Could not save profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const backAction = () => {
      if (page === 2) {
        translateX.value = -width;
        setPage(1);
        translateX.value = withTiming(0, { duration: 250 });
        return true;
      }
      if (page === 1) {
        onBackToPhone();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => subscription.remove();
  }, [page]);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#e0dcf1", "#000000"]} style={{ flex: 1 }}>
        <AppScreen edges={["top", "bottom", "left", "right"]} style={{ flex: 1 }}>
          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={50}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <ImageBackground
              source={require("../../../assets/myimages/login_bg.png")}
              resizeMode="cover"
              style={styles.container}
            >
              <View style={styles.row}>
                <Marquee spacing={0} speed={0.6}>
                  <View style={styles.marqueeContent}>
                    {row1List.map((item, index) => (
                      <Card key={`r1-${index}`} image={item} />
                    ))}
                  </View>
                </Marquee>
              </View>

              <View style={styles.row}>
                <Marquee spacing={0} speed={0.6} reverse>
                  <View style={styles.marqueeContent}>
                    {row2List.map((item, index) => (
                      <Card key={`r2-${index}`} image={item} />
                    ))}
                  </View>
                </Marquee>
              </View>

              <View style={styles.row}>
                <Marquee spacing={0} speed={0.6}>
                  <View style={styles.marqueeContent}>
                    {row3List.map((item, index) => (
                      <Card key={`r3-${index}`} image={item} />
                    ))}
                  </View>
                </Marquee>
              </View>

              <ImageBackground
                source={require("../../../assets/myimages/login_bt_bg1.png")}
                resizeMode="cover"
                style={styles.bottomContainer}
              >
                <Image
                  style={{ marginTop: 55 }}
                  source={require("../../../assets/myimages/login_logo.png")}
                />

                <Animated.View style={[styles.bottomContainer, animatedStyle]}>
                  {page === 0 ? (
                    <>
                      <Text style={styles.headText}>India's last minute laundry app</Text>
                      <Text style={styles.subText}>Log In or Sign Up</Text>

                      <View style={styles.numberRow}>
                        <View style={styles.countryCode}>
                          <CountryPicker
                            containerButtonStyle={{
                              padding: 0,
                              margin: 0,
                              borderRadius: 12,
                              borderColor: "rgba(0, 0, 0, 0.2)",
                              borderWidth: 0.1,
                            }}
                            countryCode={countryCode}
                            withFilter
                            withFlag
                            withCallingCode
                            withEmoji
                            onSelect={(country: Country) => {
                              setCountryCode(country.cca2);
                              setCallingCode(country.callingCode[0] || "91");
                            }}
                          />
                          <Text
                            style={{
                              marginLeft: -5,
                              marginRight: 4,
                              fontSize: 10,
                              color: "#666",
                              alignSelf: "center",
                            }}
                          >
                            ▼
                          </Text>
                        </View>

                        <View style={styles.numberContainer}>
                          <Text style={styles.countryCodeText}>+{callingCode}</Text>
                          <TextInput
                            style={styles.textInput}
                            placeholder="Enter mobile number"
                            placeholderTextColor="rgba(0,0,0,0.5)"
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={mobile}
                            onChangeText={(text) => {
                              setMobile(text);
                              setError("");
                            }}
                          />
                        </View>
                      </View>

                      {error ? <Text style={styles.errorText}>{error}</Text> : null}

                      <GradientButton label="Continue" onPress={sendCode} loading={loading} />
                    </>
                  ) : null}

                  {page === 1 ? (
                    <KeyboardAwareScrollView
                      enableOnAndroid
                      extraScrollHeight={30}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ flexGrow: 1 }}
                    >
                      <Text style={styles.headVerifyText}>Enter Verification Code</Text>
                      <Text style={styles.headVerifySubText}>We have sent a verification code to</Text>
                      <Text style={styles.headVerifySubText}>+{callingCode} {mobile}</Text>

                      <View style={styles.otpContainer}>
                        <OtpInput
                          numberOfDigits={6}
                          onTextChange={(text) => {
                            setOtp(text);
                            setOtpError("");
                          }}
                          focusColor="#6C4EF5"
                          theme={{
                            pinCodeContainerStyle: {
                              width: 50,
                              height: 50,
                              borderRadius: 10,
                            },
                          }}
                        />
                      </View>

                      {otpError ? (
                        <Text style={otpError.startsWith("Dev OTP") ? styles.devOtpText : styles.errorOtpText}>
                          {otpError}
                        </Text>
                      ) : null}

                      <GradientButton label="Verify" onPress={verifyCode} loading={loading} />
                    </KeyboardAwareScrollView>
                  ) : null}

                  {page === 2 ? (
                    <>
                      <Text style={styles.headVerifyText}>Almost there</Text>
                      <Text style={styles.headVerifySubText}>What should we call you?</Text>

                      <View style={styles.nameContainer}>
                        <TextInput
                          style={styles.nameInput}
                          placeholder="Full name"
                          placeholderTextColor="rgba(0,0,0,0.5)"
                          value={name}
                          onChangeText={(text) => {
                            setName(text);
                            setNameError("");
                          }}
                          autoCapitalize="words"
                        />
                      </View>

                      {nameError ? <Text style={styles.errorOtpText}>{nameError}</Text> : null}

                      <GradientButton label="Get Started" onPress={completeSignup} loading={loading} />
                    </>
                  ) : null}
                </Animated.View>
              </ImageBackground>
            </ImageBackground>
          </KeyboardAwareScrollView>
        </AppScreen>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bottomContainer: {
    flex: 1,
    width: "100%",
    height: "120%",
    resizeMode: "cover",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  headText: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.intro_head_text,
    marginTop: 20,
    textAlign: "center",
  },
  subText: {
    width: "100%",
    fontSize: 15,
    fontWeight: "400",
    color: Colors.black_color,
    textAlign: "center",
    opacity: 0.5,
    marginTop: 10,
  },
  countryCode: {
    flexDirection: "row",
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 4,
    marginLeft: 20,
    marginTop: 30,
  },
  numberRow: {
    flexDirection: "row",
    width: "100%",
  },
  numberContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "72%",
    height: 50,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.2)",
    marginTop: 30,
    marginLeft: 15,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: "400",
    color: Colors.black_color,
    textAlign: "left",
    marginLeft: 60,
    marginTop: 5,
  },
  textInput: {
    width: "100%",
    marginLeft: 10,
    marginTop: 5,
    fontSize: 15,
    fontWeight: "400",
    color: Colors.black_color,
  },
  buttonView: {
    marginTop: 50,
    width: "90%",
    height: 50,
    borderRadius: 15,
    alignSelf: "center",
    justifyContent: "center",
    marginBottom: 50,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.white_color,
    alignSelf: "center",
    textAlign: "center",
  },
  whiteSpread: {
    position: "absolute",
    top: 0.2,
    left: 0,
    right: 0,
    height: "15%",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 10,
    marginLeft: 10,
    marginTop: 5,
    width: "100%",
    textAlign: "center",
  },
  errorOtpText: {
    color: "#FF3B30",
    fontSize: 10,
    marginLeft: 20,
    marginTop: 10,
    width: "100%",
    textAlign: "left",
  },
  devOtpText: {
    color: Colors.intro_head_text,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 20,
    marginTop: 10,
    width: "100%",
    textAlign: "left",
  },
  card: {
    width: 120,
    height: 96,
    borderRadius: 16,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    marginHorizontal: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    overflow: "hidden",
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 12,
    resizeMode: "contain",
  },
  row: {
    height: 120,
    marginBottom: 0,
    overflow: "hidden",
    width: "100%",
    paddingTop: 15,
  },
  marqueeContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headVerifyText: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.intro_head_text,
    textAlign: "center",
    alignSelf: "center",
    marginTop: 20,
  },
  headVerifySubText: {
    width: "100%",
    fontSize: 15,
    fontWeight: "400",
    color: Colors.black_color,
    textAlign: "center",
    opacity: 0.5,
    marginTop: 10,
  },
  otpContainer: {
    marginLeft: 20,
    marginRight: 20,
    marginTop: 20,
  },
  nameContainer: {
    width: "90%",
    height: 50,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.2)",
    marginTop: 30,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  nameInput: {
    fontSize: 15,
    fontWeight: "400",
    color: Colors.black_color,
  },
});
