import { ReactNode } from "react";
import { StyleSheet, ViewStyle, StyleProp } from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
};


export default function AppScreen({
  children,
  style,
  edges = ["top", "left", "right"],
}: Props) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
