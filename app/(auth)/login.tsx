import React, { useContext, useState } from "react";
import { View } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { AuthContext } from "../../context/AuthContext";

export default function Login() {

  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");

  return (
    <View style={{ flex:1, justifyContent:"center", padding:20 }}>

      <Text variant="headlineMedium">Login</Text>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={{ marginVertical:20 }}
      />

      <Button mode="contained" onPress={() => login(email)}>
        Login
      </Button>

    </View>
  );
}