"use client";
import React from "react";
import styled from "styled-components";

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

type Props = {
  children: React.ReactNode;
};

const ClientLayout = ({ children }: Props) => {
  return <Container>{children}</Container>;
};

export default ClientLayout;
